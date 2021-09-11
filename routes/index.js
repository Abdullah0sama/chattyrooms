const express           = require('express');
const bcyrpt            = require('bcrypt');
const router            = express.Router();
const path              = require('path');
const expressSession    = require('express-session');
const saltRounds        = 10;
const User              = require('../models/User.js');

router.use(expressSession({
    secret: 'nothnsnfan323hu3@R3nTG$3f32fs',
    resave: false,
    saveUninitialized: false
}));

router.use(express.urlencoded({ extended: true }));
router.use(express.static('public'));
const htmlPath = path.resolve('./public/html');

router.get('/', isAuthenticated, (req, res) => {
    res.sendFile(htmlPath + '/main.html');
});

router.get('/signup', (req, res) => {
    res.sendFile(htmlPath + '/signup.html');
});

router.post('/signup', (req, res) => {
    const user = req.body.user;

    User.findOne({ username: user.username }).then( (usernameStatus) => {
        if(usernameStatus != null) throw makeError('user', 'Username already used'); 
        return  bcyrpt.hash(user.password, saltRounds);
    }).then( (hash) => {
        user.password = hash;
        return User.create(user);
    }).then( (userCreated) => {
        return res.redirect('/login');
    }).catch( (err) => {
        res.redirect(`/signup?error=${err.message}`);
    });

});

router.get('/login', (req, res) => {
    res.sendFile(htmlPath + '/login.html');
});


router.post('/login', (req, res) => {
    const user = req.body.user;
    let userID;
    User.findOne({ username: user.username }).then( (userFound) => {

        if(userFound == null) 
            return bcyrpt.compare('icantremeber', '$2b$10$DHgmPDyXukbf3gKPhA6WhOiFst5PUtjhzgTsIv0TyyCHuaJJ4TrAW');
            userID = userFound.id;
        return bcyrpt.compare(user.password, userFound.password);

    }).then( (isPasswordCorrect) => {
        if(isPasswordCorrect) {
            req.session.userID = userID;
            res.redirect('/');
        }else {
            throw makeError('user', 'Wrong username or password');
        }
    }).catch( (err) => {
        console.log(err);
        if(err.name != 'user') err.message = 'internal error';
        res.redirect(`/login?error=${err.message}`);
    });

});


function makeError(name, msg) {
    let error = new Error(msg);
    error.name = name;
    return error;
}

// Checks if the user is authenticated. If true the flow continues normally, else redirects them to the login page.
function isAuthenticated(req, res, next) {
    console.log(req.session);
    if(!req.session.userID) return res.redirect(`/login?msg=${encodeURIComponent('You must be logged in.')}`);
    User.findById(req.session.userID).then( (user) => {
        if(user == null) return res.redirect(`/login?msg=${encodeURIComponent('You must be logged in.')}`);
        else return next();
    });
}

module.exports = router;