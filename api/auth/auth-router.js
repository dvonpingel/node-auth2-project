const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { checkUsernameExists, validateRoleName } = require("./auth-middleware");
const { JWT_SECRET } = require("../secrets"); // use this secret!
const Users = require("../users/users-model");
const bcrypt = require("bcryptjs");

router.post("/register", validateRoleName, (req, res, next) => {
  /**
    [POST] /api/auth/register { "username": "anna", "password": "1234", "role_name": "angel" }

    response:
    status 201
    {
      "user"_id: 3,
      "username": "anna",
      "role_name": "angel"
    }
   */
  const creds = req.body;

  if (creds) {
    const rounds = process.env.BCRYPT_ROUNDS || 8;

    const hash = bcrypt.hashSync(creds.password, rounds);

    creds.password = hash;

    Users.add(creds)
      .then((user) => {
        res.status(201).json(user);
      })
      .catch((err) => {
        res.status(500).json({ message: err.message, stack: err.stack });
      });
  } else {
    res.status(400).json({
      message:
        "please provide username and password, password must be alphanumeric",
    });
  }
});

router.post("/login", checkUsernameExists, (req, res, next) => {
  /**
    [POST] /api/auth/login { "username": "sue", "password": "1234" }

    response:
    status 200
    {
      "message": "sue is back!",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ETC.ETC"
    }

    The token must expire in one day, and must provide the following information
    in its payload:

    {
      "subject"  : 1       // the user_id of the authenticated user
      "username" : "bob"   // the username of the authenticated user
      "role_name": "admin" // the role of the authenticated user
    }
   */
  if (req.body) {
    const { username, password } = req.body;

    Users.findBy({ username: username })
      .then(([user]) => {
        if (user && bcrypt.compareSync(password, user.password)) {
          const token = buildToken(user);
          res.status(200).json({ message: `${user.username} is back!`, token });
        } else {
          res.status(401).json({ message: "Invalid Credentials" });
        }
      })
      .catch((err) => {
        res.status(500).json({ message: err.message, stack: err.stack });
      });
  } else {
    res.status(400).json({
      message:
        "please provide username and password, password must be alphanumeric",
    });
  }
});

function buildToken(user) {
  const payload = {
    subject: user.user_id,
    username: user.username,
    role_name: user.role_name,
  };
  const config = {
    expiresIn: "1d",
  };
  return jwt.sign(payload, JWT_SECRET, config);
}

module.exports = router;
