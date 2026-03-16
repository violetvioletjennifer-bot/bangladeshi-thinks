const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';
const SECRET = 'bangladeshi-thinks-secret';

// Init DB
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({users:[],posts:[],comments:[],messages:[]}));
}

const getDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const saveDB = (db) => fs.writeFileSync(DB_FILE, JSON.stringify(db));

// Auth middleware
const auth = (req,res,next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error:'No token'});
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({error:'Invalid token'}); }
};

// SIGNUP
app.post('/api/signup', async (req,res) => {
  const {name,email,password} = req.body;
  const db = getDB();
  if (db.users.find(u=>u.email===email)) return res.status(400).json({error:'Email exists'});
  const user = {id:Date.now(),name,email,password:await bcrypt.hash(password,10),avatar:'',bio:'',friends:[],blocked:[]};
  db.users.push(user);
  saveDB(db);
  res.json({token:jwt.sign({id:user.id,name,email},SECRET)});
});

// LOGIN
app.post('/api/login', async (req,res) => {
  const {email,password} = req.body;
  const db = getDB();
  const user = db.users.find(u=>u.email===email);
  if (!user || !await bcrypt.compare(password,user.password)) return res.status(400).json({error:'Wrong credentials'});
  res.json({token:jwt.sign({id:user.id,name:user.name,email},SECRET)});
});

// GET POSTS
app.get('/api/posts', auth, (req,res) => {
  const db = getDB();
  const posts = db.posts.sort((a,b)=>b.id-a.id).map(p=>({
    ...p,
    author: db.users.find(u=>u.id===p.userId)?.name,
    comments: db.comments.filter(c=>c.postId===p.id)
  }));
  res.json(posts);
});

// CREATE POST
app.post('/api/posts', auth, (req,res) => {
  const db = getDB();
  const post = {id:Date.now(),userId:req.user.id,text:req.body.text,reactions:{bambo:0,jouta:0,fire:0,dead:0,haha:0},createdAt:new Date()};
  db.posts.push(post);
  saveDB(db);
  res.json(post);
});

// REACT
app.post('/api/posts/:id/react', auth, (req,res) => {
  const db = getDB();
  const post = db.posts.find(p=>p.id===parseInt(req.params.id));
  if (!post) return res.status(404).json({error:'Not found'});
  post.reactions[req.body.type]++;
  saveDB(db);
  res.json(post);
});

// COMMENT
app.post('/api/posts/:id/comment', auth, (req,res) => {
  const db = getDB();
  const comment = {id:Date.now(),postId:parseInt(req.params.id),userId:req.user.id,author:req.user.name,text:req.body.text};
  db.comments.push(comment);
  saveDB(db);
  res.json(comment);
});

// MESSAGE
app.post('/api/messages', auth, (req,res) => {
  const db = getDB();
  const msg = {id:Date.now(),from:req.user.id,to:req.body.to,text:req.body.text,createdAt:new Date()};
  db.messages.push(msg);
  saveDB(db);
  res.json(msg);
});

app.get('/api/messages/:userId', auth, (req,res) => {
  const db = getDB();
  const msgs = db.messages.filter(m=>(m.from===req.user.id&&m.to===parseInt(req.params.userId))||(m.from===parseInt(req.params.userId)&&m.to===req.user.id));
  res.json(msgs);
});

// USERS
app.get('/api/users', auth, (req,res) => {
  const db = getDB();
  res.json(db.users.map(u=>({id:u.id,name:u.name,bio:u.bio})));
});

app.listen(3000, ()=>console.log('🇧🇩 Bangladeshi Thinks running on port 3000!'));
