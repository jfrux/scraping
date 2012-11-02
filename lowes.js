var scraper = require('scraper');
var fs = require("fs");
var output = "";
var records = [];
var departments = {
  'bathroom':'http://www.lowes.com/Bathroom/_/N-1z0z4ih/pl',
  'building_supplies':'http://www.lowes.com/Building-Supplies/_/N-1z13cih/pc',
  'cleaning':'http://www.lowes.com/Cleaning-Organization/_/N-1z13eb4/pc',
  'electrical':'http://www.lowes.com/Electrical/_/N-1z0yt4x/pl',
  'hardware':'http://www.lowes.com/Hardware/_/N-1z13cne/pc',
  'lawncare':'http://www.lowes.com/Lawn-Care-Landscaping/_/N-1z13dw5/pl',
  'paint':'http://www.lowes.com/Paint/_/N-1z0yyfe/pc',
  'plumbing':'http://www.lowes.com/Plumbing/_/N-1z13dr7/pc',
  'tools':'http://www.lowes.com/Tools/_/N-1z13e72/pc',
  'flooring':'http://www.lowes.com/Flooring/_/N-1z13ckl/pc',
  'heatingcooling':'http://www.lowes.com/Heating-Cooling/_/N-1z13cpa/pc',
  'decor':'http://www.lowes.com/Home-Decor/_/N-1z13dfg/pc',
  'outdoorsliving':'http://www.lowes.com/Outdoor-Living/_/N-1z13ehd/pc',
  'outdoorsequipt':'http://www.lowes.com/Outdoor-Power-Equipment/_/N-1z0zc7s/pc',
  'windowsdoors':'http://www.lowes.com/Windows-Doors/_/N-1z13eny/pl',
  'gardencenter':'http://www.lowes.com/Garden-Center/_/N-1z100gd/pl',
  'holiday':'http://www.lowes.com/Home-Decor/Holiday-Decorations/_/N-1z0ycu4/pl'
}
var startCategory = 'hardware';

if(process.argv[2]) {
startCategory = process.argv[2];  
}

var dateFormat = require("dateformat");
var _ = require("underscore");
var now = new Date();
var outputFile = "./output_" + startCategory + "_" + dateFormat(now,"yyyymmdd_hhMMss") + ".txt";

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});

function goScrape(Url,cb) {
  var scrapeCb = cb;
  var theUrl = Url;

  
  if(records.indexOf(theUrl) > -1) {
    return;
  };

  if(records.length == 0) {
    var heading = {
      type:'node_type',
      text:'node_name',
      parentPath:['node_parentpath'],
      path:['node_path'],
      link:'node_url'
    }
    writeOutput(heading);
  }
  console.log("Processing\t" + theUrl.replace('http://www.lowes.com','').substr(0,50) + "...");

  scraper(
    {
      'uri': theUrl,
      'headers': {
          'User-Agent': 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0)'
      }
    },
    function(err, $) {
      if (err) { throw err };
      
      try {
        if($("#left_rail,#left_rail_pl")) {
          $("#left_rail .cat_nav li a,#left_rail_pl .categories li a").each(function() {
            var item = {};
            item.link = 'http://www.lowes.com' + $(this).attr('href');
            item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
            item.type = "category";
            item.path = [];

            $("#breadcrumbs li").each(function() {
              var crumbText = "";
              crumbText = $(this).find('a').text().trim();

              if(crumbText.length == 0) {
                crumbText = $(this).text().trim();
              }

              item.path.push(crumbText);
            });
            item.parentPath = _.clone(item.path);
            item.path.push(item.text);

            writeOutput(item);

            goScrape(item.link,function() {
              console.log("Completed\t" + item.path.join(":"));
              item = null;
            });
          });

          $("#left_rail_pl .expandable > li > a").each(function() {
            var item = {};
            item.link = 'http://www.lowes.com' + $(this).attr('href');
            
            if($(this).text()) {
              item.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();
            } else {
              item.text = '';
            }

            item.path = [];

            if(!new RegExp("(rating|price|brand|other ways to shop)", "gi").test(item.text)) {
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
              item.parentPath = _.clone(item.path);
            
              item.path.push(item.text);

              item.type = "filter_group";

              writeOutput(item);

              //list filters
              $(this).next('ul').find('li a').each(function() {
                var subitem = {};
                subitem.link = 'http://www.lowes.com' + $(this).attr('href');
                
                subitem.text = $(this).text().replace(new RegExp("\\(([0-9]+)\\)", "gi"),'').trim();

                subitem.path = _.clone(item.path);

                subitem.parentPath = _.clone(subitem.path);
            
                subitem.path.push(subitem.text);
                subitem.type = "filter";

                writeOutput(subitem);
              });
            }
          });
        }

        scrapeCb();


        writeOutput = null;
        $ = null;
      } catch (err) {
        console.log(err);

        scrapeCb(err);
        writeOutput = null;
        $ = null;
      }
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

//loops through them all now
for(key in Object.keys(departments)) {
  goScrape(departments[startCategory],function() {
    console.log('Completed.');
  });
}


