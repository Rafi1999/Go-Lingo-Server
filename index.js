const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
//const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vw1cwl2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const usersCollection = client.db("golingoDb").collection("users");
    const classesCollection = client.db("golingoDb").collection("classes");

    const selectedCollection = client.db("golingoDb").collection("selected");

    // class apis
    app.get('/class', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })
    // app.get('/addClass',async(req,res)=>{
    //   const result = await classesCollection.find().toArray();
    //   res.send(result);
    // })
    app.post('/addClass', async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    })

    //selected collection
    app.get('/selected', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await selectedCollection.find(query).toArray();
      res.send(result);
    });
    app.post('/selected', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await selectedCollection.insertOne(item);
      res.send(result);
    })
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedCollection.deleteOne(query);
      res.send(result);
    })
    //user apis
    // app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
    //     const result = await usersCollection.find().toArray();
    //     res.send(result);
    //   });

    // app.post('/users', async (req, res) => {
    //   const user = req.body;
    //   const query = { email: user.email }
    //   const existingUser = await usersCollection.findOne(query);

    //   if (existingUser) {
    //     return res.send({ message: 'user already exists' })
    //   }

    //   const result = await usersCollection.insertOne(user);
    //   res.send(result);
    // });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send("Go-Lingo server is running")
})

app.listen(port, () => {
  console.log(`Go-Lingo is running on port ${port}`);
})