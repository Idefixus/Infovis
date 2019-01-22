
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

//----Wiesn-JSON-Action------
var contentsWiesn = fs.readFileSync("views/oktoberfest.json");
var jsonContentWiesn = JSON.parse(contentsWiesn);

//----Test
var contentGermanCities = fs.readFileSync("res/datapublishers.json");
var jsonGermanCities = JSON.parse(contentGermanCities);



var publicDir = path.join(__dirname + '/res');
app.use(express.static(publicDir));
app.use(bodyParser.urlencoded({ extended: true }));
//app.set('view engine', 'html');

// Get random events from db:
// Load them with the start page by passing data on get

app.get('/', function (req, res) {
    console.log(JSON.stringify(jsonGermanCities, null, 2));
    var jsonLength = Object.keys(jsonGermanCities.features).length;
    /*for (var i = 0; i < jsonLength; i++) {
        console.log(jsonGermanCities.features[i].city);
    }*/
    // connect to the database: Throw error if not successful
    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
    });
    // Random events

    //var events = ["maassen", "hamburger" ];
    var events = {"events": [
                            {"name": "maassen", "image": "Maaßen.jpg"},
                            {"name": "oktoberfest", "image": "oktoberfest.png"},
                            {"name": "hamburg", "image": "icon_hamburg.png"},
                            {"name": "bundesregierung", "image": "bundestag.png"}
                        ] };
    var number = Math.floor((Math.random() * 2));
    var currentevent = events.events[number];
    var jsonData;
    switch (currentevent.name) {
        case "maassen":
            jsonData = jsonContent;
            break;
        case "oktoberfest":
            jsonData = jsonContentWiesn;
            break;
    }
    console.log(currentevent);
    console.log("Number:" + number);

    var cityarray = [];
    for (var i = 0; i < jsonLength; i++) {
        var city = jsonGermanCities.features[i].city;
        connection.query(`select sum(sum) as sum, city from (
        Select count(id) as sum, "` + city + `" as city 
        from newspapers.documents
        where(description LIKE "%` + city + `%" or title like "%` + city + `%") 
        and date between str_to_date("01/01/2018", "%d/%m/%Y") and str_to_date("30/09/2018", "%d/%m/%Y")
        UNION
        Select count(id) as sum, "` + city + `" as city
        from newspapers.documents 
        where newsportal = "Bild" 
        and (description LIKE "%` + city + `%" or title like "%` + city + `%") 
        and str_to_date(date, '%d.%m.%Y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
        UNION
        Select count(id) as sum, "` + city + `" as city
        from newspapers.documents 
        where newsportal = "Donaukurier" 
        and (description LIKE "%` + city + `%" or title like "%` + city + `%") 
        and str_to_date(date, '%a, %d %b %y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
        UNION
        Select count(id) as sum, "` + city + `" as city
        from newspapers.documents 
        where newsportal = "Sueddeutsche Zeitung" 
        and (description LIKE "%` + city + `%" or title like "%` + city + `%") 
        and str_to_date(replace(replace(replace(replace(substring(date, 5, 25), 'Mär', 'Mar'), 'Dez', 'Dec'), 'Mai', 'May'), 'Okt', 'Oct'), '%d %b %Y') 
        between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')) as t; `, function (err, result) {
            if (err) {
                console.error(err);
                return;
            }
            
            cityarray.push(result[0]);
            console.log(result[0]);
            if (cityarray.length == jsonLength) {
                res.render('index', { cityarray: cityarray, currentevent: currentevent, data: jsonData });
            }
        });
    }
    
    //res.render('app', { data: jsonContent, dataWiesn: jsonContentWiesn });
}); 

app.get('/drawlinechart', function (req, res) {
    console.log("passed parameter: city =" + req.query.city);
    var city = req.query.city;
    var resultarray = [];
    
    connection.query(`Select round((b.amount/a.amount)*100, 2) as Amount, a.month as Year from
(select sum(amount) as amount, month from (
Select count(id) as amount, date_format(date, "%m") as month
from newspapers.documents 
where date between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('31/09/2018', '%d/%m/%Y') 
group by month
UNION
Select count(id) as amount, date_format(str_to_date(date, '%d.%m.%Y'), "%m") as month
from newspapers.documents 
where newsportal = "Bild" 
	and str_to_date(date, '%d.%m.%Y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
    group by month
UNION
Select count(id) as amount, date_format(str_to_date(date, '%a, %d %b %y'), "%m") as month
from newspapers.documents 
where newsportal = "Donaukurier" 
    and str_to_date(date, '%a, %d %b %y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
    group by month
UNION
Select count(id) as amount, date_format(str_to_date(replace(replace(replace(replace(substring(date, 5, 25), 'Mär', 'Mar'), 'Dez', 'Dec'), 'Mai', 'May'), 'Okt', 'Oct'), '%d %b %Y') , "%m") as month
from newspapers.documents 
where newsportal = "Sueddeutsche Zeitung" 
    and str_to_date(replace(replace(replace(replace(substring(date, 5, 25), 'Mär', 'Mar'), 'Dez', 'Dec'), 'Mai', 'May'), 'Okt', 'Oct'), '%d %b %Y') 
	between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
    group by month
) as t
group by month 
order by month) a,
(select sum(amount) as amount, month from(
 Select count(id) as amount, date_format(date, "%m") as month
    from newspapers.documents 
    where (description LIKE '%` + city + `%' or title like '%` + city + `%') and date between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('31/09/2018', '%d/%m/%Y') 
   group by month
 UNION
Select count(id) as amount, date_format(str_to_date(date, '%d.%m.%Y'), "%m") as month
from newspapers.documents 
where newsportal = "Bild" 
	and (description LIKE '%` + city + `%' or title like '%` + city + `%')  
	and str_to_date(date, '%d.%m.%Y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
    group by month
UNION
Select count(id) as amount, date_format(str_to_date(date, '%a, %d %b %y'), "%m") as month
from newspapers.documents 
where newsportal = "Donaukurier" 
	and (description LIKE '%` + city + `%' or title like '%` + city + `%')  
    and str_to_date(date, '%a, %d %b %y') between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
	group by month
UNION
Select count(id) as amount, date_format(str_to_date(replace(replace(replace(replace(substring(date, 5, 25), 'Mär', 'Mar'), 'Dez', 'Dec'), 'Mai', 'May'), 'Okt', 'Oct'), '%d %b %Y') , "%m") as month
from newspapers.documents 
where newsportal = "Sueddeutsche Zeitung" 
	and (description LIKE '%` + city + `%' or title like '%` + city + `%')  
    and str_to_date(replace(replace(replace(replace(substring(date, 5, 25), 'Mär', 'Mar'), 'Dez', 'Dec'), 'Mai', 'May'), 'Okt', 'Oct'), '%d %b %Y') 
	between str_to_date('01/01/2018', '%d/%m/%Y') and str_to_date('30/09/2018', '%d/%m/%Y')
    group by month
    ) as t
    group by month
    order by month) b where b.month = a.month`, function (err, result) {

        if (err) {
            console.error(err);
            return;
        }

        var month = 1;
        for (var i = 0; i < result.length; i++) {
            var row = result[i];
            while (parseInt(row.Year) != month) {
                var insertmonth = '0' + month;
                resultarray.push({ Amount: 0, Year: insertmonth });
                month++;
            }
            resultarray.push(row);
            month++;
        }

        console.log(resultarray);
            //res.json({ monthdata: resultarray });
    });

    //TOP 5 keywords
    connection.query(`SELECT keyword, COUNT(b.id) AS anzahl
    FROM documents AS b
    JOIN documents_keywords AS a ON a.document_id = b.id
    JOIN keywords AS c ON a.keyword_id = c.id
    WHERE (description LIKE '%` + city + `%' or title like '%` + city + `%') and keyword not in ('` + city + `', 'Deutschland', 'Politik', 'Sport', 'Regional', 'Fussball', '', 'Süddeutsche Zeitung München')
    GROUP BY keyword
    ORDER BY anzahl DESC
    limit 5;`, function (err, result) {
        
        if (err) {
            console.error(err);
            return;
        }

        console.log(result);
        res.json({ monthdata: resultarray, top5: result });
        });
});

/*app.get('/home', function (req, res) {
  res.sendFile(path.join(__dirname + '/select.html'));
  
});*/ 
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


app.post('/oktoberfest', function (req, res) {

    // connect to the database: Throw error if not successful
    connection.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
    });

    connection.query('SELECT *, ' /*MONTH(date),*/ + 'count(newsportal) AS count FROM newspapers.documents WHERE description LIKE "% Oktoberfest %"' /* and MONTH(date)=9*/ + ' GROUP BY newsportal ORDER BY count DESC;', function (err, result) {
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

        res.render('oktoberfest', { data: jsonContentWiesn, sum: sum, results: result });
    });


});



/*app.post('/home', function (req, res) {
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
}); */

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

