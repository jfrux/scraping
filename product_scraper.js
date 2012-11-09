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

db.connect();
db.query('SELECT * FROM ojects.categories WHERE hasproducts = \'true\' ORDER BY textpath LIMIT 6000', function(err,rows,fields) {
  console.log(rows);
  var agent = httpAgent.create('www.grainger.com');
  //start url
  agent.addUrl('Grainger/wwg/start.shtml');

  var $basecats = '';
  var regexp = new RegExp("(N\-[a-zA-Z0-9]+)");
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

  // function writeProduct(item) {
  //   var prod = new Product(item);
  //   log("Saving Product",item.name);

  //   prod.save(function (err) {
  //     if (err) {
  //       return log('error',err);
  //     } // TODO handle the error

  //     log('Saved Product',item.name);
  //     agent.emit('productLoaded',null,prod);
  //   });
  // }

  agent.addListener('start',function(e,agent) {
    console.log(agent);
    log("Page Start",agent.url);
  });
  agent.addListener('stop',function(e,agent) {
    log("Page End",agent.url);
  });
  agent.addListener('next', function (e, agent) {
    log("Rendering",agent.url);
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
        var bctitle = $(".productsFoundText").justtext().replace(new RegExp('\/','gi'),'').trim();
        var bclinks = $.map($('.productsFoundText a'),$.text);
        bclinks.push(bctitle);
        bclinks = $.map(bclinks,function(link) {
          if(link.trim().length) {
            return link.trim();
          }
        });

        var hasSubCats = ($(selector.catlist).text().trim() == 'Browse');
        var hasProducts = ($(selector.productlist).length > 0);
        if(regexp.exec(agent.url)) {
          var catKey = regexp.exec(agent.url)[0];  
        } else {
          var catKey = '';
        }
        
        var parentCat = $(".productsFoundText a:last");
        if(regexp.test($(parentCat).attr('href'))) {
          var parentCatKey = regexp.exec($(parentCat).attr('href'))[0];
        } else {
          var parentCatKey = '';
        }
        
        var curr_cat = {
          'name':bctitle,
          'textpath':bclinks,
          'key':catKey,
          'link':agent.url,
          'hassubcats':hasSubCats,
          'hasproducts':hasProducts,
          'parentkey':parentCatKey
        };

        log("Parsed Category",curr_cat.textpath);
        
        if(err) return false;
          
          var breadcrumbs = bclinks;
          var title = bctitle;

          
          log("Started","Scraping " + newcat.name);

          //products
          if(hasProducts) {
            log("comment",newcat.name + '\t' + 'Has products list...');
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
                'cat':newcat.key,
                '_cat':newcat._id
              };

              agent.once("productLoaded",function(err,curr_prod) {

              });

              log("Found Product",product.name);
              writeProduct(product);
            });

            if(nextLink) {
              log("Add Page", nextLink.replace('http://www.grainger.com',''));
             
              agent.addUrl(nextLink.replace('http://www.grainger.com',''));  
            }
          }

          window.close();
          log("Completed","Scraping " + newcat.name);
          agent.next();
        
        writeCategory(curr_cat);
     
    });
  });

  // Start the agent
  agent.start();
});
