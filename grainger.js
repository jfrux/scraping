var scraper = require('scraper');
var fs = require("fs");
var output = "";
var records = [];

var startCategory = 'hardware';

if(process.argv[2]) {
startCategory = process.argv[2];  
}

var selector = {
  'productlist':'.esr_itemListBody tr',
  'productimg':'td:nth-child(2) img',
  'productname':'td:nth-child(3) span a',
  'productkey':'td:nth-child(3) a:nth-child(2)',
  'productprice':'td:nth-child(9) div.pirce',
  'basecatlist':'#ProductsMenu li a',
  'catlist':'.ecn_catListTable td',
  'nextPageLink':'.paginationContainer li:last a'
};

var dateFormat = require("dateformat");
var _ = require("underscore");
var now = new Date();
var outputFile = "./output_" + startCategory + "_" + dateFormat(now,"yyyymmdd_hhMMss") + ".txt";


var baseUrl = 'http://www.grainger.com/Grainger/';
var goScrape = function(baseitem,cb) {
  var scrapeCb = cb;
  var theUrl = baseitem.link;

  if(records.indexOf(theUrl) > -1) {
    return;
  };

  // if(records.length == 0) {
  //   var heading = {
  //     type:'name',
  //     text:'node_name',
  //     parentPath:['node_parentpath'],
  //     path:['node_path'],
  //     link:'node_url'
  //   }
  //   writeOutput(heading);
  // }

  console.log("[" + baseitem.text + "] Processing...");

  scraper(
    {
      'uri': theUrl,
      'headers': {
          'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
      }
    },
    function(err, $) {
      //if (err) { throw err };
      //subcats
        if($(selector.catlist)) {
          console.log("[" + baseitem.text + "] Has sub cats...");
        }

        //products
        if($(selector.productlist)) {
          console.log("[" + baseitem.text + "] Has products list...");
          // $("#left_rail .cat_nav li a,#left_rail_pl .categories li a").each(function() {
          //   var item = {};
          //   item.link = 'http://www.lowes.com' + $(this).attr('href');
          //   item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
          //   item.type = "category";
          //   item.path = [];

          //   $("#breadcrumbs li").each(function() {
          //     var crumbText = "";
          //     crumbText = $(this).find('a').text().trim();

          //     if(crumbText.length == 0) {
          //       crumbText = $(this).text().trim();
          //     }

          //     item.path.push(crumbText);
          //   });
          //   item.parentPath = _.clone(item.path);
          //   item.path.push(item.text);

          //   writeOutput(item);

          //   goScrape(item.link,function() {
          //     console.log("Completed\t" + item.path.join(":"));
          //     item = null;
          //   });
          // });

          // $("#left_rail_pl .expandable > li > a").each(function() {
          //   var item = {};
          //   item.link = 'http://www.lowes.com' + $(this).attr('href');
            
          //   if($(this).text()) {
          //     item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
          //   } else {
          //     item.text = '';
          //   }

          //   item.path = [];

          //   if(!new RegExp("(rating|price|brand|other ways to shop)", "gi").test(item.text)) {
          //     $("#breadcrumbs li").each(function() {
          //       var crumbText = "";
          //       crumbText = $(this).find('a').text().trim();

          //       if(crumbText.length == 0) {
          //         crumbText = $(this).text().trim();
          //       }

          //       if(crumbText.length > 0) {
          //         item.path.push(crumbText);
          //       }
          //     });
          //     item.parentPath = _.clone(item.path);
            
          //     item.path.push(item.text);

          //     item.type = "filter_group";

          //     writeOutput(item);

          //     //list filters
          //     $(this).next('ul').find('li a').each(function() {
          //       var subitem = {};
          //       subitem.link = 'http://www.lowes.com' + $(this).attr('href');
                
          //       subitem.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();

          //       subitem.path = _.clone(item.path);

          //       subitem.parentPath = _.clone(subitem.path);
            
          //       subitem.path.push(subitem.text);
          //       subitem.type = "filter";

          //       writeOutput(subitem);
          //     });
          //   }
          // });
        }

        scrapeCb();


        writeOutput = null;
        $ = null;
      // try {
        
      // } catch (err) {
      //   console.log(err);

      //   scrapeCb(err);
      //   writeOutput = null;
      //   $ = null;
      // }
    },
    {
      reqPerSec: 0.2
    }
);


  function writeOutput(item) {
    var itemPath = item.path.join(":").replace('Home:','');
    var itemParentPath = item.parentPath.join(":").replace('Home:','');
    var output = [item.type.trim(),item.text.trim(),itemParentPath,itemPath,item.link.trim()]
    
    records.push(theUrl);

    console.log("Writing\t\t" + itemPath);
    fs.appendFileSync(outputFile,output.join('\t') + '\n','utf8');
  }
};

//GRAB BASE CATEGORIES
scraper({
  'uri': baseUrl + "static/products.html",
  'headers': {
      'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
  }
},
function(err, $) {
  var $basecats = $(selector.basecatlist);

  $basecats.each(function() {
    var $baseitem = $(this);
    var baseitem = {
      link:'http://www.grainger.com' + $baseitem.find('a').attr('href'),
      text:$baseitem.text().trim()
    };

    goScrape(baseitem,function() {
      console.log("[" + baseitem.text + "] Complete!");
    });
  });
});



// //loops through them all now
// for(key in Object.keys(departments)) {
//   goScrape(departments[startCategory],function() {
//     console.log('Completed.');
//   });
// }


