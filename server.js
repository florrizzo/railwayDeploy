import express from 'express';
const app = express();
import config from './config.js';
import { ProductosDaoMongoDB } from './daos/ProductosDaoMongoDB.js';
import { MensajesDaoMongoDB } from './daos/MensajesDaoMongoDB.js';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as HttpServer } from 'http';
import { Server as Socket } from 'socket.io';
import { normalize, schema, denormalize } from 'normalizr';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import Usuarios from './models/usuarios.js';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import routes from './routes.js';
import pkg from 'compression';
const compression = pkg;
import winston from 'winston';
import cluster from 'cluster';
import { cpus } from 'os';

const PORT = parseInt(process.argv[2]) || 8081;
const modoCluster = process.argv[3] == 'CLUSTER';

/* Winston configuration */

const logger = winston.createLogger({
  level: 'warn',
  transports: [
    new winston.transports.Console({ level: 'info' }),
    new winston.transports.File({ filename: 'warn.log', level: 'warn' }),
    new winston.transports.File({ filename: 'info.log', level: 'error' }),
  ],
});

if (modoCluster && cluster.isPrimary) {
  const numCPUs = cpus().length;

  logger.log('info', `Número de procesadores: ${numCPUs}`);
  logger.log('info', `PID MASTER ${process.pid}`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    logger.log(
      'info',
      'Worker',
      worker.process.pid,
      'died',
      new Date().toLocaleString()
    );
    cluster.fork();
  });
}

app.use(compression());

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: config.MONGO,
      mongoOptions: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    }),
    secret: 'secreto',
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

//IMPLEMENTACION
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpServer = new HttpServer(app);
const io = new Socket(httpServer);

httpServer.listen(PORT, () =>
  console.log('SERVER ON http://localhost:' + PORT)
);

app.use(express.json());
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

/* Mongo conection */

async function connectMG() {
  try {
    await mongoose.connect(config.MONGO, { useNewUrlParser: true });
    logger.log('info', 'Conectado a mongo! ✅');
  } catch (e) {
    logger.log('error', e);
    throw 'can not connect to the db';
  }
}

await connectMG();

function isValidPassword(user, password) {
  return bcrypt.compareSync(password, user.password);
}

function createHash(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
}

passport.use(
  'login',
  new LocalStrategy((username, password, done) => {
    Usuarios.findOne({ username }, (err, user) => {
      if (err) return done(err);

      if (!user) {
        logger.log('info', 'User Not Found with username ' + username);
        return done(null, false);
      }

      if (!isValidPassword(user, password)) {
        logger.log('info', 'Invalid Password');
        return done(null, false);
      }

      return done(null, user);
    });
  })
);

passport.use(
  'signup',
  new LocalStrategy(
    {
      passReqToCallback: true,
    },
    (req, username, password, done) => {
      Usuarios.findOne({ username: username }, function (err, user) {
        if (err) {
          logger.log('error', 'Error in SignUp: ' + err);
          return done(err);
        }

        if (user) {
          logger.log('info', 'User already exists');
          return done(null, false);
        }

        const newUser = {
          username: username,
          password: createHash(password),
        };
        Usuarios.create(newUser, (err, userWithId) => {
          if (err) {
            logger.log('info', 'Error in Saving user: ' + err);
            return done(err);
          }
          logger.log('info', user);
          logger.log('info', 'User Registration succesful');
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

const contenedor = new ProductosDaoMongoDB();
const messages = new MensajesDaoMongoDB();

app.get(
  '/',
  (req, res, next) => {
    logger.log('info', '127.0.0.1 - Method: GET');
    next();
  },
  routes.checkAuthentication,
  routes.getMain
);

app.post(
  '/login',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/login - Method: POST');
    next();
  },
  passport.authenticate('login', { failureRedirect: '/faillogin' }),
  routes.postLogin
);

app.get(
  '/login',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/login - Method: GET');
    next();
  },
  routes.getLogin
);

app.get(
  '/register',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/register - Method: GET');
    next();
  },
  routes.getRegister
);

app.post(
  '/register',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/register - Method: POST');
    next();
  },
  passport.authenticate('signup', { failureRedirect: '/failRegister' }),
  routes.postSignup
);

app.get(
  '/failLogin',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/failLogin - Method: GET');
    next();
  },
  (req, res) => {
    res.render('failLogin');
  }
);

app.get(
  '/failRegister',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/failRegister - Method: GET');
    next();
  },
  (req, res) => {
    res.render('failRegister');
  }
);

app.get(
  '/showsession',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/showsession - Method: GET');
    next();
  },
  (req, res) => {
    res.json(req.session);
  }
);

app.get(
  '/logout',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/logout - Method: GET');
    next();
  },
  routes.getLogout
);

app.get(
  '/info',
  (req, res, next) => {
    logger.log('info', '127.0.0.1/info - Method: GET');
    next();
  },
  routes.getInfo
);

app.get(
  '/*',
  (req, res, next) => {
    logger.log('warn', 'ruta no encontrada - Method: GET');
    next();
  },
  (req, res) => {
    res.json({ error: true, descripcion: 'ruta no encontrada' });
  }
);

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

  const authorSchema = new schema.Entity('authors', { idAttribute: 'id' });
  const messageSchema = new schema.Entity(
    'message',
    {
      author: authorSchema,
    },
    { idAttribute: '_id' }
  );

  const normalizedListMessages = normalize(ListMessages, [messageSchema]);
  const cantOriginal = JSON.stringify(ListMessages).length;
  const cantNormalizada = JSON.stringify(normalizedListMessages).length;
  const respuesta = [normalizedListMessages, cantOriginal, cantNormalizada];
  return respuesta;
}
normalizarMensajes();

io.on('connection', async (socket) => {
  logger.log('info', 'Usuario conectado');
  io.sockets.emit('msg-list', await normalizarMensajes());
  io.sockets.emit('product-list', await contenedor.getAll());

  socket.on('msg', async (data) => {
    await messages.saveMsg(
      data.id,
      data.nombre,
      data.apellido,
      data.edad,
      data.alias,
      data.avatar,
      data.text
    );
    io.sockets.emit('msg-list', await normalizarMensajes());
  });

  socket.on('product', async (data) => {
    await contenedor.save(data.title, data.price, data.thumbnail);
    io.sockets.emit('product-list', await contenedor.getAll());
  });
});
