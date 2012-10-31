var scraper = require('scraper');
var fs = require("fs");
var output = "";
var records = [];
var dateFormat = require("dateformat");
var _ = require("underscore");
var now = new Date();
var outputFile = "./output_" + dateFormat(now,"yyyymmdd_hhMMss") + ".csv";

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

function goScrape(theUrl) {
  scraper(
    {
       'uri': theUrl
           , 'headers': {
               'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
           }
    }
    ,function(err, $) {
        if (err) {throw err}
        
        try {
          if($("#left_rail,#left_rail_pl")) {
            $("#left_rail .cat_nav li a,#left_rail_pl .categories li a").each(function() {
              var item = {};
              item.link = 'http://www.lowes.com' + $(this).attr('href');
              item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'');
              item.path = [];

              $("#breadcrumbs li").each(function() {
                var crumbText = "";
                crumbText = $(this).find('a').text().trim();

                if(crumbText.length == 0) {
                  crumbText = $(this).text().trim();
                }

                if(crumbText.length > 0) {
                  item.path.push(crumbText);
                }
              });

              item.type = "category";
              console.log(item);
              writeOutput(item);

              process.nextTick(function() {
                  goScrape(item.link);     
              });
            });

            $("#left_rail_pl .expandable > li > a").each(function() {
              var item = {};
              item.link = 'http://www.lowes.com' + $(this).attr('href');
              item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
              item.path = [];

              if(!new RegExp("(rating|price|brand)", "gi").test(item.text)) {
                $("#breadcrumbs li").each(function() {
                  var crumbText = "";
                  crumbText = $(this).find('a').text().trim();

                  if(crumbText.length == 0) {
                    crumbText = $(this).text().trim();
                  }

                  if(crumbText.length > 0) {
                    item.path.push(crumbText);
                  }
                });

                item.path.push(item.text);



                item.type = "filter";

                writeOutput(item);

                //list filters
                $(this).next('ul').find('li a').each(function() {
                  var subitem = {};
                  subitem.link = 'http://www.lowes.com' + $(this).attr('href');

                  subitem.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
                  subitem.path = _.clone(item.path);

                  subitem.path.push(subitem.text);

                  subitem.type = "filter";

                  writeOutput(subitem);
                });
              }
            });
          }

          
        } catch (err) {
          console.log(err);
        }
    }
    ,
    {
reqPerSec: 0.2
    }
);
};

function writeOutput(item) {
  var output = [item.type.trim(),item.text.trim(),item.path.join(":"),item.link.trim()]

  fs.appendFileSync(outputFile,output + '\n','utf8');
}

goScrape('http://www.lowes.com/Hardware/Cabinet-Hardware/_/N-1z0zzau/pl?Ns=p_product_avg_rating|1');




