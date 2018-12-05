
var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var mysql = require('mysql');

app.set('view engine', 'ejs');

// define the connection credentials
var connection = mysql.createConnection({
    host     : '127.0.0.1',
    user     : 'test',
    password : 'test',
    database    : 'newspapers'
});


var publicDir = path.join(__dirname + '/res');
app.use(express.static(publicDir));
app.use(bodyParser.urlencoded({ extended: true }));
//app.set('view engine', 'html');
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/app.html'));
  
}); 
app.get('/home', function (req, res) {
  res.sendFile(path.join(__dirname + '/select.html'));
  
}); 

app.post('/home', function (req, res) {
  console.log("You submitted: " + req.body.keyword + " and the date: " + req.body.date);
  // SELECT * FROM newspapers.documents where title = 'AfD';
  // On post select query and return to view
      // Select request with prevention of sql injection
      var keyword = req.body.keyword;

      // connect to the database: Throw error if not successful
      connection.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
      });
      var query = connection.query('SELECT newsportal,count(newsportal) as count FROM newspapers.documents where title = ? group by newsportal;', keyword , function(err, result){
          if (err){
              console.error(err);
              return;
          }
          var array = [];
          for (var i = 0; i < result.length; i++) {
            var row = result[i];
            array.push(row);

        }
        console.log(array);
        res.render('result', {date: array});
        
      });
      connection.end();
  
      
}); 
  // TODO Inlcude Templating enginge. : ejs npm install ejs --save app.set('view engine', 'pug'); app.get('/', function (req, res) {
  //res.render('index', { title: 'Hey', message: 'Hello there!'});
 // });

  // TODO Include D3.js: <script src="https://d3js.org/d3.v5.js"></script>
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

