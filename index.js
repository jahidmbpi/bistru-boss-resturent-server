const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORt || 5000;
require("dotenv").config();
// midlewaire
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const req = require("express/lib/request");
const uri = `mongodb+srv://${process.env.BISTRO_BOSS}:${process.env.BISTRO_PASSWORD}@cluster0.g8zp6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // data api
    app.get("/almenu", async (req, res) => {
      const cursor = menuCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/review", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

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
