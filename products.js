var colorize = require('colorize');
var httpAgent = require('http-agent');
var jsdom  = require('jsdom');
var fs = require("fs");
var mysql = require("mysql");
var metrics = require('metrics');
var meter = new metrics.Meter();
var _ = require("underscore");
var dateFormat = require("dateformat");
var cconsole = colorize.console;
var now = new Date();
var outputFile = './products_' + dateFormat(now,'mmddyyhhMMss') + '.txt';
var db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'cfr010408',
  database : 'ojects'
});

var processedCount = 0;
var regexp = new RegExp("(N\-[a-zA-Z0-9]+)");
db.connect();
setInterval(function() {
  cconsole.log('#blue[' + meter.oneMinuteRate()*60 + ']');
}, 3000);
db.query('SELECT * FROM ojects.categories WHERE hasproducts=\'true\' ORDER BY textpath LIMIT 100,5800', function(err,rows,fields) {
  var baseUrls = [];
  for(row in rows) {
    //start url
    baseUrl = {
      method: 'GET',
      categoryData:rows[row],
      uri: rows[row].link.replace('http://www.grainger.com','') + '&Ns=SKU%7C0'
    }
    baseUrls.push(baseUrl);
  }

  var agent = httpAgent.create('www.grainger.com',baseUrls);

  var selector = {
    'productlist':'.esr_itemListBody input[type=hidden]',
    'productimg':'td:nth-child(2) img',
    'productname':'td:nth-child(3) span a',
    'productlink':'td:nth-child(3) span a',
    'productkey':'td:nth-child(3) > div > a:first',
    'productprice':'td:nth-child(9) div.pirce',
    'basecatlist':'#ProductsMenu li a',
    'catlist':'.searchNavPaneTitle:first',
    'pageslist':'.paginationContainer li a',
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
  
  function writeProducts(items) {
    log('Database','Building insert SQL');
    
    var sql = 'INSERT IGNORE INTO `products` (';
    sql += '`name`,`details`,`price`,`link`,`img`,`extkey`,`catkey`,`catid`';
    sql += ') VALUES ';
    
    sql += _.map(items,function(item,key,items) {
      var itemprice = item.price.replace('$','').replace(',','');
      
      if(!itemprice.length) {
        itemprice = 0.00;
      }

      var resp = "(";
          resp += db.escape(item.name) + ",";
          resp += db.escape(item.details) + ",";
          resp += itemprice + ",";
          resp += "'" + item.link + "',";
          resp += "'" + item.img + "',";
          resp += "'" + item.key + "',";
          resp += "'" + item.catkey + "',";
          resp += item.catid;
          resp += ")";

      return resp;
    }).join(",");
    
    if(items.length) {

      log('Database','Executing SQL');
      //log('Database',sql);
      db.query(sql, function(err,results) {
        if(err) throw err;

        log('Database','Inserted products.');
        processedCount = parseInt(processedCount) + items.length;
        meter.mark(items.length);
      });
    } else {
      log('error','No items found to insert...');
    }
  };
  
  agent.addListener('start',function(e,agent) {
    log("Job","Started..." + agent.url.uri);
  });

  agent.addListener('stop',function(e,agent) {
    log("Job","Done..." + agent.url.uri);
    db.end();
    log("Database","Database connection is closed.");
    process.exit();
  });

  agent.addListener('next', function (e, agent) {
    log("Rendering",agent.url.uri);
    var catkey = regexp.exec(agent.url.uri)[0];

    // if (addPage) {
    //   // The agent will now also visit 'http://graph.facebook.com/yahoo'
    //   agent.addUrl('yahoo');
    //   //addPage = false;
    // }
    jsdom.env({
      html: agent.body,
      scripts: [
        'http://code.jquery.com/jquery-1.8.2.min.js'
      ]
    }, function(err, window) {
      var $ = window.jQuery;

      // jQuery is now loaded on the jsdom window created from 'agent.body'
      
      //basecats
      //current page
      //products
      if($(selector.productlist).length > 0) {
        var nextLink = null;
        if($(selector.nextPageLink).attr('href')) {
          nextLink = _.clone(agent.url);
          nextLink.uri = $(selector.nextPageLink).attr('href').replace('http://www.grainger.com','');
        }
        
        var $products = $(selector.productlist);
        var products = [];
        
        $products.each(function() {
          var $product = $(this).next('tr');
          var product = {
            'key':$product.find(selector.productkey).text().replace('Item #','').trim(),
            'name':$product.find(selector.productname).text(),
            'details':$product.find('td:nth-child(3) div').contents().filter(function(){ return(this.nodeType == 3); }).text(),
            'price':$product.find(selector.productprice).text(),
            'link':$product.find(selector.productlink).attr('href'),
            'img':'http:' + $product.find(selector.productimg).attr('src'),
            'catkey':catkey,
            'catid':agent.url.categoryData.id
          };
          if(product.key.length) {
            products.push(product);
          }
        });

        writeProducts(products);

        if(nextLink) {
          log("Job", "Adding Page... " + nextLink.uri);
         
          agent.addUrl(nextLink);  
        }
      }

      window.close();
      log("Completed","Scraping " + agent.url.uri);
      agent.next();
    });
  });

  // Start the agent
  agent.start();
});
