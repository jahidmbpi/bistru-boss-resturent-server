const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORt || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// midlewaire
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const req = require("express/lib/request");
const uri = `mongodb+srv://jahid:gBo9CYknnlBlVekt@cluster0.g8zp6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    //   database collection
    const menuCollection = client.db("bistroDB").collection("menuDb");
    const reviewCollection = client.db("bistroDB").collection("reviewDb");
    const userCollection = client.db("bistroDB").collection("userDb");
    const cardCollection = client.db("bistroDB").collection("cardDb");
    const paymentsCollection = client.db("bistroDB").collection("payments");
    // data api
    // review related api
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // menu related api
    app.post("/menu", async (req, res) => {
      const menuData = req.body;
      console.log(menuData);
      const result = await menuCollection.insertOne(menuData);
      res.send(result);
    });
    app.get("/almenu", async (req, res) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    // get menu for paigination
    app.get("/menu", async (req, res) => {
      const { category, currentPage, itemPerPage } = req.query;
      // console.log(category, currentPage, itemPerPage);
      const totaldata = currentPage * itemPerPage;

      const query = {
        category: category,
      };
      const options = {
        projection: { _id: 1, name: 1, image: 1, price: 1, recipe: 1 },
      };
      const result = await menuCollection
        .find(query, options)
        .skip(parseInt(totaldata))
        .limit(parseInt(itemPerPage))
        .toArray();
      res.send(result);
    });
    app.delete("/deletemenu/:id", async (req, res) => {
      const id = req.params.id;

      const foundItem = await menuCollection.findOne({ _id: id });
      console.log("Found Item:", foundItem);

      const query = { _id: id };

      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/update/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateMenu = req.body;
        const filter = { _id: id };
        const updateFields = {};
        if (updateMenu.name !== undefined) updateFields.name = updateMenu.name;
        if (updateMenu.recipe !== undefined)
          updateFields.recipe = updateMenu.recipe;
        if (updateMenu.category !== undefined)
          updateFields.category = updateMenu.category;
        if (updateMenu.price !== undefined)
          updateFields.price = updateMenu.price;
        const updateDoc = { $set: updateFields };
        const result = await menuCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch {
        console.log(error);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // payment related api
    app.post("/payments", async (req, res) => {
      const paymentInfo = req.body;
      console.log("payment data", paymentInfo);
      const PayResult = await paymentsCollection.insertOne(paymentInfo);
      console.log(PayResult);
      const query = {
        _id: {
          $in: paymentInfo?.cardId?.map((id) => new ObjectId(id.toString())),
        },
      };
      const result = await cardCollection.deleteMany(query);
      console.log(result);
      res.send(result);
    });

    app.get("/payment", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await paymentsCollection.find(filter).toArray();
      res.send(result);
    });
    // user related api
    app.post("/addUser", async (req, res) => {
      const user = req.body;

      if (!user.role) {
        user.role = "user";
      }

      try {
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add user", error });
      }
    });
    // get all user
    app.get("/allUser", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });
    // update user as admin
    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "admin" } };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    app.get("/admin", async (req, res) => {
      try {
        const userEmail = req.query.email;
        console.log("User email:", userEmail);

        if (!userEmail) {
          return res.status(400).json({ message: "User email is required" });
        }

        const query = { email: userEmail };
        const user = await userCollection.findOne(query);
        console.log("User found:", user);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "admin") {
          return res.send((isAdmin = true));
        }
        return res.send((isAdmin = false));
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    app.get("/admin-stats", async (req, res) => {
      const user = await userCollection.estimatedDocumentCount();
      const totalMenu = await menuCollection.estimatedDocumentCount();
      const order = await paymentsCollection.estimatedDocumentCount();
      const result = await paymentsCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totaalRevenieu: { $sum: "$price" },
            },
          },
        ])
        .toArray();

      const revenue = result.length > 0 ? result[0].totaalRevenieu : 0;
      res.send({ user, totalMenu, order, revenue });
    });

    app.get("/order-stats", async (req, res) => {
      const result = await paymentsCollection
        .aggregate([
          {
            $unwind: "$menuId",
          },
          {
            $lookup: {
              from: "menuDb",
              localField: "menuId",
              foreignField: "_id",
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems",
          },
          {
            $group: {
              _id: "$menuItems.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$menuItems.price" },
            },
          },
        ])
        .toArray();
      res.send(result);
    });

    // upadet user as genarel user
    app.patch("/user/genareluser/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: "user" } };
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    // delete user from database
    app.delete("/user/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ error: "Invalid user ID" });
        }

        const filter = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(filter);

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send({ message: "User deleted successfully", result });
      } catch (error) {
        res.status(500).send({ error: "Internal server error" });
      }
    });

    // card related api
    app.post("/addCard", async (req, res) => {
      const card = req.body;
      console.log(card);
      const result = await cardCollection.insertOne(card);
      res.send(result);
    });

    app.get("/cards", async (req, res) => {
      const result = await cardCollection.find().toArray();
      res.send(result);
    });

    app.delete("/cards/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    });
    // payment api
    // payment intent api
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { totalPrice } = req.body;
        console.log("Received price:", totalPrice);

        if (!totalPrice || isNaN(totalPrice)) {
          return res.status(400).send({ error: "Invalid price value" });
        }

        const amount = Math.round(parseFloat(totalPrice) * 100);
        console.log("Amount in cents:", amount);

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          automatic_payment_methods: { enabled: true },
        });

        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        console.error("Payment Intent Error:", error);
        res.status(500).send({ error: error.message });
      }
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("boss is running");
});
app.listen(port, () => {
  console.log(`bistro boss is running on port ${port}`);
});
