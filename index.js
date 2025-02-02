
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
//console.log("Name:", jsonContent.Name);
//console.log("Bio:", jsonContent.Bio);
//console.log("Ereignisse:", jsonContent.Ereignisse);
//console.log("\n *EXIT* \n");

//----Wiesn-JSON-Action------
var contentsWiesn = fs.readFileSync("views/oktoberfest.json");
var jsonContentWiesn = JSON.parse(contentsWiesn);

//----Regierung-JSON-Action------
var contentsRegierung = fs.readFileSync("views/bundesregierung.json");
var jsonContentRegierung = JSON.parse(contentsRegierung);

//----load data for German cities ----
var contentGermanCities = fs.readFileSync("res/datapublishers.json");
var jsonGermanCities = JSON.parse(contentGermanCities);

var finalcityarray = []
var finalCityStats = {}

// preload data from database for single cities
var calcCityStats = function (callback) {

    var jsonLength = Object.keys(jsonGermanCities.features).length;
    var calc = function (city) {

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
               var resultarray = [];
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
                   finalCityStats[city] = { monthdata: resultarray, top5: result };

                   // this is the last successfull callback
                   console.log(Object.keys(finalCityStats))
                   if (Object.keys(finalCityStats).length == jsonLength) {
                       callback()
                   }

               });

            });
    }
    for (var i = 0; i < jsonLength; i++) {
        calc(jsonGermanCities.features[i].city);
    }

}

// preload data from database for the Germany map
var calcMainStats = function (callback) {
    var cityarray = [];
    var jsonLength = Object.keys(jsonGermanCities.features).length;
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

            // this is the last successfull callback
            if (cityarray.length == jsonLength) {
                callback()
                finalcityarray = cityarray
            }
        });
    }
}

// call preload functions and wait for callback to open port 
calcMainStats(function () {
    calcCityStats(function () {
        app.listen(3000, function () {
            console.log('Example app listening on port 3000!');
            console.log("NOW EVERTHINGS IS READY!")
        });
    })
})


var publicDir = path.join(__dirname + '/res');
app.use(express.static(publicDir));
app.use(bodyParser.urlencoded({ extended: true }));


// Connect to the database.
connection.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
});

var jsonData;

app.get('/', function (req, res) {
    console.log(JSON.stringify(jsonGermanCities, null, 2));
    // Get random events from db:
    // Load them with the start page by passing data on get

    var events = {"events": [
                            {"name": "maassen", "image": "Maaßen.jpg"},
                            {"name": "oktoberfest", "image": "oktoberfest.png"},
                            {"name": "bundesregierung", "image": "bundestag.png"},
                            {"name": "hamburg", "image": "icon_hamburg.png"}
                        ] };
    var number = Math.floor((Math.random() * 3));
    var currentevent = events.events[number];
    
    switch (currentevent.name) {
        case "maassen":
            jsonData = jsonContent;
            break;
        case "oktoberfest":
            jsonData = jsonContentWiesn;
            break;
        case "bundesregierung":
            jsonData = jsonContentRegierung;
            break;
    }
    console.log(currentevent);
    console.log("Number:" + number);
    console.log(jsonData);
    res.render('index', { cityarray: finalcityarray, currentevent: currentevent, data:jsonData });
}); 


app.get('/drawlinechart', function (req, res) {
    console.log("passed parameter: city =" + req.query.city);
    var city = req.query.city;
    res.json(finalCityStats[city]);
  
});


app.post('/summary', function (req, res) {
    var passedUrl = req.url.split("=");
    var eventName = passedUrl[passedUrl.length - 1];
    console.log("Req post = " + eventName);



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

});

app.get('/maassen', function(req, res){

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
            
            res.render('maassen', { data: jsonData, sum: sum, results: result });
    }); 
        

});


app.get('/oktoberfest', function (req, res) {

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

        res.render('oktoberfest', { data: jsonData, sum: sum, results: result });
    });
});

// The Bundestag event page

app.post('/bundesregierung', function (req, res) {

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

        res.render('bundesregierung', { data: jsonData, sum: sum, results: result });
    });
});

app.get('/bundesregierung', function (req, res) {

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

        res.render('bundesregierung', { data: jsonContentRegierung, sum: sum, results: result });
    });
});

