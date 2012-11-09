var colorize = require('colorize');
var httpAgent = require('http-agent');
var jsdom  = require('jsdom');
var fs = require("fs");
var mysql = require("mysql");
var cconsole = colorize.console;
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'cfr010408',
  database : 'ojects'
});
  var agent = httpAgent.create('www.grainger.com');

var regexp = new RegExp("(N\-[a-zA-Z0-9]+)");
db.connect();
db.query('SELECT * FROM ojects.categories WHERE hasproducts = \'true\' ORDER BY textpath LIMIT 100', function(err,rows,fields) {
  
  for(row in rows) {
    //start url
    agent.addUrl(rows[row].link);
  }

  var selector = {
    'productlist':'.esr_itemListBody > input',
    'productimg':'td:nth-child(2) img',
    'productname':'td:nth-child(3) span a',
    'productkey':'td:nth-child(3) :nth-child(3)',
    'productprice':'td:nth-child(9) div.pirce',
    'basecatlist':'#ProductsMenu li a',
    'catlist':'.searchNavPaneTitle:first',
    'nextPageLink':'.paginationContainer li:last a'
  };

  function log(action,detail) {
    if(action == "error") {
      cconsole.log('#cyan[scraper] #bold[#red[Error]]\t' + detail);
    } else if(action == "comment") {
      cconsole.log('#cyan[scraper] #italic[#bold[#white[Comment]]\t' + detail + ']');
    } else {
      cconsole.log('#cyan[scraper] #bold[#green[' + action + ']]\t' + detail);
    }
  }

  function writeProduct(item) {
  log("comment","Push category...");
  var output = [
    item.key,
    item.name,
    item.price,
    item.img,
    item.catkey
  ];
  // if(item.parentkey.trim().length) {
  //   //has parent, lookup...
  //   Category.findOne({ 'key': item.parentkey }, function (err, cat) {
  //     save(cat);
  //   });
  // } else {
  //   save(null);
  // }

  fs.appendFileSync('./products.txt',output.join('\t') + '\n');
}

  agent.addListener('start',function(e,agent) {
    console.log(agent);
    log("Page Start",agent.url);
  });
  agent.addListener('stop',function(e,agent) {
    log("Page End",agent.url);
  });
  agent.addListener('next', function (e, agent) {
    log("Rendering",agent.url);
    var catkey = regexp.exec(agent.url)[0];
    // if (addPage) {
    //   // The agent will now also visit 'http://graph.facebook.com/yahoo'
    //   agent.addUrl('yahoo');
    //   //addPage = false;
    // }

    jsdom.env({
      html: agent.body,
      scripts: [
        'http://code.jquery.com/jquery-1.8.2.min.js',
        'http://viralpatel.net/blogs/demo/jquery/get-text-without-child-element/jquery.justtext.1.0.js'
      ]
    }, function(err, window) {
      var $ = window.jQuery;
      // jQuery is now loaded on the jsdom window created from 'agent.body'
      
      //basecats
        //current page
          //products
          console.log($(selector.productlist).length);
          if($(selector.productlist).length > 0) {
            console.log("HAS PRODUCTS");
            if($(selector.nextPageLink).attr('href')) {
              var nextLink = $(selector.nextPageLink).attr('href');
            }
            
            var $products = $(selector.productlist);

            $products.each(function() {
              var $product = $(this).next('tr');
              var product = {
                'key':$product.find(selector.productkey).text().replace('Item #','').trim(),
                'name':$product.find(selector.productname).text(),
                'price':$product.find(selector.productprice).text(),
                'img':'http:' + $product.find(selector.productimg).attr('src'),
                'catkey':catkey
              };

              log("Found Product",product.name);
              writeProduct(product);
            });

            if(nextLink) {
              log("Add Page", nextLink.replace('http://www.grainger.com',''));
             
              agent.addUrl(nextLink.replace('http://www.grainger.com',''));  
            }
          }

          window.close();
          log("Completed","Scraping " + agent.url);
          agent.next();
    });
  });

  // Start the agent
  agent.start();
});
