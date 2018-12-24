// Dependencies
var express = require("express");
var exphbs = require("express-handlebars");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3000;


// Create an instance of the express app.
var app = express();

//use Handlebars
app.engine(
    "handlebars",
    exphbs({
      defaultLayout: "main"
    })
  );
  app.set("view engine", "handlebars");

// Use morgan logger for logging requests

  app.use(logger("dev"));
  // Parse request body as JSON
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  // Make public a static folder
  app.use(express.static("public"));
  
  // Connect to the Mongo DB
  mongoose.connect("mongodb://localhost/codingArticals", { useNewUrlParser: true });
  
  // Routes........................................
  app.get("/", function(req, res) {
    db.Article.find().then(function(articles){
      console.log(articles);
      res.render("index", {name:"Pushpinder", articles:articles});
    })

   });

   app.get("/saved", function(req, res) {
    res.render("comments");
   });
// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
// this code clears the database everytime i run this scrape code
  db.Article.deleteMany(function (err) {
    if (err) throw err;
    console.log("Database cleared");
  });
  // First, we grab the body of the html with axios
  axios.get("https://www.freecodecamp.org/forum/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    // console.log(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $(".category h2").each(function(i, element) {
      // Save an empty result object
      
      var result = {};
// console.log(element);
      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h2 a")
        .text();
      result.link = $(this)
        .children("h2 a")
        .attr("href");
      result.description = $(this)
      .siblings("span")
      .text();

      // Create a new Article using the `result` object built from scraping
      // console.log("result:", result);
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("comment")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Comment.create(req.body)
    .then(function(dbComment) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbComment._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
