/* Imports */
const express = require("express");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const ProductosDaoMongoDB = require("./daos/ProductosDaoMongoDB");
const MensajesDaoMongoDB = require("./daos/MensajesDaoMongoDB");
const HttpServer = require("http").Server;
const Socket = require("socket.io").Server;
const { normalize, schema, denormalize } = require("normalizr");
const session = require("express-session");
const Usuarios = require("./models/usuarios.js");
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

/* Express server */
const app = express();

if (process.env.MODE != "production") {
  require("dotenv").config();
}

const PORT = process.env.PORT;
const MODE = process.env.MODE;
const MONGO_URL = process.env.MONGO_URL;

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: MONGO_URL,
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    }),
    secret: "secreto",
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

//IMPLEMENTACION
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer);

httpServer.listen(PORT, () => {
  console.log({
    PORT,
    MODE,
    MONGO_URL,
  });
});

app.use(express.json());
app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

/* Mongo conection */
async function connectMG() {
  try {
    await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    console.log("Conectado a mongo! ✅");
  } catch (e) {
    console.log(e);
    throw "can not connect to the db";
  }
}

connectMG();

/* Passport */
function isValidPassword(user, password) {
  return bcrypt.compareSync(password, user.password);
}

function createHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

passport.use(
  "login",
  new LocalStrategy((username, password, done) => {
    Usuarios.findOne({ username }, (err, user) => {
      if (err) return done(err);

      if (!user) {
        console.log("User Not Found with username " + username);
        return done(null, false);
      }

      if (!isValidPassword(user, password)) {
        console.log("Invalid Password");
        return done(null, false);
      }

      return done(null, user);
    });
  })
);

passport.use(
  "signup",
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    (req, username, password, done) => {
      Usuarios.findOne({ username: username }, function (err, user) {
        if (err) {
          console.log("Error in SignUp: " + err);
          return done(err);
        }

        if (user) {
          console.log("User already exists");
          return done(null, false);
        }

        const newUser = {
          username: username,
          password: createHash(password),
        };
        Usuarios.create(newUser, (err, userWithId) => {
          if (err) {
            console.log("Error in Saving user: " + err);
            return done(err);
          }
          console.log(user);
          console.log("User Registration succesful");
          return done(null, userWithId);
        });
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser((id, done) => {
  Usuarios.findById(id, done);
});

app.use(passport.initialize());
app.use(passport.session());

/* Endpoints */
/* app.get("/", (req, res) => {
  res.json({
    PORT,
    MODE,
    MONGO_URL,
  });
}); */

const routes = require("./routes");

app.get("/", routes.checkAuthentication, routes.getMain);

app.post(
  "/login",
  passport.authenticate("login", { failureRedirect: "/faillogin" }),
  routes.postLogin
);

app.get("/login", routes.getLogin);

app.get("/register", routes.getRegister);

app.post(
  "/register",
  passport.authenticate("signup", { failureRedirect: "/failRegister" }),
  routes.postSignup
);

app.get("/failLogin", (req, res) => {
  res.render("failLogin");
});

app.get("/failRegister", (req, res) => {
  res.render("failRegister");
});

app.get("/showsession", (req, res) => {
  res.json(req.session);
});

app.get("/logout", routes.getLogout);

app.get("/info", routes.getInfo);

const contenedor = new ProductosDaoMongoDB();
const messages = new MensajesDaoMongoDB();

/* Normalizr */
async function normalizarMensajes() {
  const Messages = await messages.getAll();
  const ListMessages = [];
  for (const message of Messages) {
    const mensajeNuevo = {
      author: {
        id: message.author.id,
        nombre: message.author.nombre,
        apellido: message.author.apellido,
        edad: message.author.edad,
        alias: message.author.alias,
        avatar: message.author.avatar,
      },
      text: message.text,
      _id: JSON.stringify(message._id),
    };
    ListMessages.push(mensajeNuevo);
  }

  const authorSchema = new schema.Entity("authors", { idAttribute: "id" });
  const messageSchema = new schema.Entity(
    "message",
    {
      author: authorSchema,
    },
    { idAttribute: "_id" }
  );

  const normalizedListMessages = normalize(ListMessages, [messageSchema]);
  const cantOriginal = JSON.stringify(ListMessages).length;
  const cantNormalizada = JSON.stringify(normalizedListMessages).length;
  const respuesta = [normalizedListMessages, cantOriginal, cantNormalizada];
  return respuesta;
}
normalizarMensajes();

/* Sockets */
io.on("connection", async (socket) => {
  console.log("Usuario conectado");
  io.sockets.emit("msg-list", await normalizarMensajes());
  io.sockets.emit("product-list", await contenedor.getAll());

  socket.on("msg", async (data) => {
    await messages.saveMsg(
      data.id,
      data.nombre,
      data.apellido,
      data.edad,
      data.alias,
      data.avatar,
      data.text
    );
    io.sockets.emit("msg-list", await normalizarMensajes());
  });

  socket.on("product", async (data) => {
    await contenedor.save(data.title, data.price, data.thumbnail);
    io.sockets.emit("product-list", await contenedor.getAll());
  });
});
