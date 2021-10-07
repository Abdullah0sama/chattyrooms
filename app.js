const express           = require('express');
const http              = require('http');
const path              = require('path');
const mongoose          = require('mongoose');
const expressSession    = require('express-session');
const app               = express();
const httpServer        = http.createServer(app);
const PORT              = process.env.PORT || 3000;




const session = expressSession({
    secret: 'nothnsnfan323hu3@R3nTG$3f32fs',
    resave: false,
    saveUninitialized: false,
});

require('./socketioEvents.js').initialize(httpServer, session);

app.use(session);
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost/testChat', {useNewUrlParser: true, useUnifiedTopology: true})
.then( () => {
    console.log('Connected to Database!');
}).catch( (err) => {
    console.log(err);
});

mongoose.set('debug', true);


// Routes 
const indexRoute = require('./routes/index.js');
app.use(indexRoute);




httpServer.listen(PORT, () => {
    console.log('Server has started at port ' + PORT);
})
