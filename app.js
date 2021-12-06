var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var exhbs = require('express-handlebars');
var helper = require('handlebars-helpers')();
var Handlebars = require('handlebars');
require('dotenv').config()


var hbs = exhbs.create({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' ,helpers:helper})


var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var app = express();
var fileUpload = require('express-fileupload')
var db = require('./config/connection')
var session = require('express-session')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.engine('hbs', hbs.engine)
app.use(session({ secret: "key", cookie: { maxAge: 600000 }, saveUninitialized: true, resave: false }))
db.connect((err) => {
  if (err) console.log('Connection err');
  else console.log('Database connected')
})
app.use(fileUpload())
app.use('/', userRouter);
app.use('/admin', adminRouter);

Handlebars.registerHelper('viewcartbutton',function(context,options,price){
console.log(options)
  for(key in context){
 
    if(options.toString() === context[key].item.toString()){
      var inp=true;
      break;
    }else{
      var inp = false  
    }
  }
  if (inp===true) {
    var data =`<a href="/cart" class="btn btn-primary mt-3" >View cart</a>`
  }else{
    
    var data=`<button onclick="addToCart('${options}','${price}'),myFunction()" class="btn btn-primary">Add to
    Cart</button>`
  }
  return data
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  console.log("The error is : ",err.message)
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
