const express = require("express");
const app = express();
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lo1m20r.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const usersCollection = client.db("classicItDB").collection("users");
    const cartCollection = client.db("classicItDB").collection("cart");
    const productsCollection = client.db("classicItDB").collection("products");

    app.post("/checktoken", async (req, res) => {
      const token = req.body.token;
      const existingUser = await usersCollection.findOne({ token: token });
      res.send({
        email: existingUser?.email,
        token: existingUser?.token,
      });
    });

    // users create api
    app.post("/register", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email, password: user?.password };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // users log in api
    app.post("/login", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email, password: user?.password };
      const token = uuidv4();
      const existingUser = await usersCollection.updateOne(query, {
        $set: { token: token },
      });

      res.send({ ...existingUser, token });
    });

    // user log out api
    app.post("/logout", async (req, res) => {
      const user = req.body.userReducer;
      const token = uuidv4();
      const query = { email: user?.email, token: user?.token };

      const existingUser = await usersCollection.updateOne(query, {
        $set: { token: "" },
      });
      res.send({ ...existingUser, token });
    });

    // get all products Data
    app.get('/products', async(req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    // add cart data api
    app.post("/cart", async (req, res) => {
      const data = req.body;
      let { userEmail, ...pro } = data;

      const query = { userEmail: userEmail };
      const existingData = await cartCollection.findOne(query);
      if (!existingData) {
        const result = await cartCollection.insertOne({
          userEmail: userEmail,
          products: [pro],
        });
        res.send(result);
      }
      if (existingData) {
        const findProduct = existingData.products.find((product) => product._id === data.id);
        if (findProduct) {
          return res.send({ message: "Product already added to the cart" });
        } else {
          const result = await cartCollection.updateOne(
            { userEmail: data.userEmail },
            { $push: { products: { $each: [pro] } } }
          );
          return res.send({ message: "Product added to the cart", result });
        }
      }
    });

    // get cart data api
    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("shop_bd is running");
});

app.listen(port, () => {
  console.log(`shop_bd Server is running on port ${port}`);
});
