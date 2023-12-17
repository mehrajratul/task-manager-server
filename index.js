const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const port = process.env.PORT || 5001;

//middlewares
app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorised access" });
  }
  //extracting the token from the authorization header
  const token = authorization.split(" ")[1];

  //verify the token
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorised accesss" });
    }

    if (!decoded || !decoded.email) {
      return res
        .status(401)
        .send({ error: true, message: "invalid token format" });
    }

    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xyn8hrw.mongodb.net/?retryWrites=true&w=majority`;

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

    const taskCollection = client.db("taskDB").collection("tasks");
    const reviewCollection = client.db("taskDB").collection("reviews");
    const userCollection = client.db("taskDB").collection("users");

    //jwt related api
    app.post("/jwt", (req, res) => {
      try {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
          expiresIn: "1h",
        });
        res.send({ token });
      } catch (error) {
        console.error("error generating jwt:", error);
        res.status(500).send({ error: true, message: "internal server error" });
      }
    });

    //users api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const savedUser = req.body;
      const result = await userCollection.insertOne(savedUser);
      res.send(result);
    });

    //task related api
    app.get("/tasks", verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const query = email ? { email } : {};
      const result = await taskCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/tasks", verifyToken, async (req, res) => {
      const newTask = req.body;
      const result = await taskCollection.insertOne(newTask);
      res.send(result);
    });

    app.patch("/tasks/:id", async (req, res) => {
      try {
        console.log("Received Params:", req.params);
        const id = req.params.id;
        console.log("Received ID:", id);
        const filter = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updatedTask = req.body;
        const task = {
          $set: {
            task: updatedTask.task,
          },
        };

        const result = await taskCollection.updateOne(filter, task, options);
        res.send(result);
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.delete("/tasks/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.deleteOne(query);
      res.send(result);
    });

    //review related api
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/review", async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("task manager is running");
});

app.listen(port, () => {
  console.log("Task manager is runnig on port", port);
});
