var colorize = require('colorize');
var httpAgent = require('http-agent');
var jsdom  = require('jsdom');
var fs = require("fs");
var cconsole = colorize.console;
var _ = require("underscore");
var agent = httpAgent.create('www.grainger.com');
//start url
agent.addUrl('Grainger/wwg/start.shtml');
var records = [];
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

function writeCategory(item) {
  log("comment","Push category...");
  var output = [
    item.name,
    item.textpath.join(":"),
    item.key,
    item.link,
    item.hassubcats,
    item.hasproducts,
    item.parentkey
  ];

  // if(item.parentkey.trim().length) {
  //   //has parent, lookup...
  //   Category.findOne({ 'key': item.parentkey }, function (err, cat) {
  //     save(cat);
  //   });
  // } else {
  //   save(null);
  // }

  fs.appendFileSync('./categories.txt',output.join('\t') + '\n');
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
    if(!$basecats.length) {
      log("Init","Loading base categories...");
      $basecats = $("#ProductsMenu li a");

      $basecats.each(function() {
          var $basecat = $(this);

          if(regexp.test($basecat.attr('href'))) {
            var catKey = regexp.exec($basecat.attr('href'))[0];  
          } else {
            var catKey = '';
          }

          var basecat = {
            'name':$basecat.text().trim(),
            'textpath':['Home',$basecat.text().trim()],
            'key':catKey,
            'link':$basecat.attr('href'),
            'hassubcats':true,
            'hasproducts':false,
            'parentkey':''
          };

          log("Parsed Category",basecat.textpath);
          writeCategory(basecat);

          log("Init","Found '" + basecat.name + "'");
          log("Add Page",basecat.link.replace('http://www.grainger.com',''));
          agent.addUrl(basecat.link.replace('http://www.grainger.com',''));


      });

      window.close();
      log("Init","Done! Moving on to first category.");
      agent.next();
    } else {
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
      var breadcrumbs = bclinks;
      var title = bctitle;

      
      log("Started","Scraping " + curr_cat.name);

      //subcats
      if(hasSubCats) {
        log("comment",curr_cat.name + '\t' + 'Has sub categories...');
      
        var $subcats = $(selector.catlist).next('.searchNavPaneContent').find('li a');

        $subcats.each(function() {
          var $cat = $(this);
          if(regexp.test($cat.attr('href'))) {
            var catKey = regexp.exec($cat.attr('href'))[0];  
          } else {
            var catKey = '';
          }

          var textpath = curr_cat.textpath.slice();
          textpath.push($cat.text().trim());

          var sub_cat = {
            'name':$cat.text().trim(),
            'textpath':textpath,
            'key':catKey,
            'link':$cat.attr('href'),
            'hassubcats':textpath.length <= 3 ? true : false,
            'hasproducts':textpath.length >= 4 ? true : false,
            'parentkey':curr_cat.key
          };

          writeCategory(sub_cat);
          log("Add Page", sub_cat.link.replace('http://www.grainger.com',''));
          agent.addUrl(sub_cat.link.replace('http://www.grainger.com',''));
        });
      }

      window.close();
      log("Completed","Scraping " + curr_cat.name);
      agent.next();
    }
  });
});

// Start the agent
agent.start();
