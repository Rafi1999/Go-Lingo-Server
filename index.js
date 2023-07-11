const express = require('express');
const app = express();
const cors = require('cors');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
//const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
const verifyJWT = (req,res,next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error : true, message : 'unauthorized access'})
  }
  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({error: true,message : 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}

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

    //jwt
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1h'})
      res.send({token}) 
    })

    // verifying admin function middleware
    const verifyAdmin = async(req,res,next)=>{
      const email = req.decoded.email;
      const query = {email : email};
      const user = await usersCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error : true, message : 'forbidden message'});
      }
      next();
    }
    // class apis
    app.get('/class/all', async (req, res) => {
      const query = {status : 'approved'}
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    })
    app.get('/class',verifyJWT, async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    })
    // app.get('/addClass',async(req,res)=>{
    //   const result = await classesCollection.find().toArray();
    //   res.send(result);
    // })
    app.post('/class', async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    })

    //selected collection
    app.get('/selected',verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if(email!==decodedEmail){
        return res.status(403).send({error : true, message : 'forbidden access'})
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
    /*

    */ 
    //user apis
    app.get('/users',verifyJWT,verifyAdmin,async(req,res)=>{
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = {email : user.email}
      const existingUser = await usersCollection.findOne(query);
      if(existingUser){
        return res.send({message: "User already exists"})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })
    // delete User
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })

    /* admin check layer :
    1. verifyJwt
    2. email check
    3. check admin
    */
    app.get('/users/admin/:email',verifyJWT, async (req, res) => {
      const email = req.params.email;
      if(req.decoded.email!==email) {
        res.send({admin : false})
      }
      const query = {email : email}
      const user = await usersCollection.findOne(query);
      const result = {admin : user?.role === 'admin'}
      res.send(result);
    })
    // make admin
    app.patch('/users/admin/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updated = {
        $set: {
          role : 'admin'
        },
      };
      const result = await usersCollection.updateOne(filter,updated);
      res.send(result);
    })

    // instructor
    app.get('/users/instructor/:email',verifyJWT, async (req, res) => {
      const email = req.params.email;
      if(req.decoded.email!==email) {
        res.send({instructor : false})
      }
      const query = {email : email}
      const user = await usersCollection.findOne(query);
      const result = {instructor : user?.role === 'instructor'}
      res.send(result);
    })
    app.get("/users/ins", async (req, res) => {
      const query = { role:"instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/users/student", async (req, res) => {
      const query = { role:"student" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    // make instructor
    app.patch('/users/instructor/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = {_id : new ObjectId(id)};
      const updated = {
        $set: {
          role : 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter,updated);
      res.send(result);
    })

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