
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
    database: 'newspapers'
});

// Load maaßen content
// LOAD JSON
var fs = require("fs");
console.log("\n *STARTING* \n");
// Get content from file
var contents = fs.readFileSync("views/maaßen.json");
// Define to JSON type
var jsonContent = JSON.parse(contents);
// Get Value from JSON
console.log("Name:", jsonContent.Name);
console.log("Bio:", jsonContent.Bio);
console.log("Ereignisse:", jsonContent.Ereignisse);
console.log("\n *EXIT* \n");



var publicDir = path.join(__dirname + '/res');
app.use(express.static(publicDir));
app.use(bodyParser.urlencoded({ extended: true }));
//app.set('view engine', 'html');

// Get random events from db:
// Load them with the start page by passing data on get

app.get('/', function (req, res) {
  res.render('app', {data: jsonContent});
}); 
app.get('/home', function (req, res) {
  res.sendFile(path.join(__dirname + '/select.html'));
  
}); 
app.post('/summary', function (req, res) {
    var passedUrl = req.url.split("=");
    var eventName = passedUrl[passedUrl.length - 1];
    console.log("Req post = " + eventName);

    // connect to the database: Throw error if not successful
    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
    });

    connection.query('SELECT newsportal, count(newsportal) AS count FROM newspapers.documents WHERE title LIKE "%' + eventName + '%" GROUP BY newsportal ORDER BY count DESC;', function (err, result) {
        if (err) {
            console.error(err);
            return;
        }
        console.log(result);

        var sum = 0;
        Object.keys(result).forEach(function (key) {
            var row = result[key];
            sum += row.count;
        }); 

        res.render('summary', { event: eventName, sum: sum, results: result });
    });
    //connection.end();
});

app.post('/maassen', function(req, res){

    // DB 
    // connect to the database: Throw error if not successful
    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
    });

    connection.query('SELECT *, MONTH(date), count(newsportal) AS count FROM newspapers.documents WHERE description LIKE "% Maaßen %" and MONTH(date)=9 GROUP BY newsportal ORDER BY count DESC;', function (err, result) {
        if (err) {
            console.error(err);
            return;
        }
        
        console.log(result);

        var sum = 0;
        Object.keys(result).forEach(function (key) {
            var row = result[key];
            sum += row.count;
            }); 
            
            res.render('maassen', { data: jsonContent, sum: sum, results: result });
    }); 
        

});


app.post('/home', function (req, res) {
  console.log("You submitted: " + req.body.keyword + " and the date: " + req.body.date);
  // SELECT * FROM newspapers.documents where title = 'AfD';
  // On post select query and return to view
      // Select request with prevention of sql injection
    var keyword = req.body.keyword;

    // connect to the database: Throw error if not successful
    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
    });

    connection.query('SELECT newsportal,count(newsportal) as count FROM newspapers.documents where title LIKE "%' + keyword + '%"  group by newsportal;' , function(err, result){
          if (err){
              console.error(err);
              return;
          }
          //var array = [];
          //for (var i = 0; i < result.length; i++) {
          //  var row = result[i];
          //  array.push(row);

          //}
          console.log(result);
          res.render('result', { testtest: result });
        //console.log(array);
        //res.render('result', {date: array});
        
      });
      connection.end();
}); 

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

