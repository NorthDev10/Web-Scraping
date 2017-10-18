const POSITION = 'Front-end';
const CITY = 'Вся Украина';
const FILE_NAME = 'vacancies.csv';
/////////////////////////////////////////////////////////////////////////////

const Nightmare = require('nightmare');
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const writer = csvWriter();
const nightmare = Nightmare({ show: true })
    .useragent("Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36");
    
Nightmare.action('scrollIntoView', function (selector, done) {
  this.evaluate_now((selector) => {
    try {
      document.querySelector(selector).scrollIntoView(true)
    } catch(e) {
      document.querySelector('footer').scrollIntoView(true)
    }
  }, done, selector)
});

let scrabbleInHtml = () => {
  
  let getCompany = (html) => {
    try {
      return html
                .querySelector('.job-link div > span:first-child')
                .innerHTML.replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };

  let getPosition = (html) => {
    try {
      return html
                .querySelector('h2 a')
                .textContent
                .replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };

  let getPrice = (html) => {
    try {
      return html
                .querySelector('h2 span')
                .textContent.match(/\d+\sгрн/i)[0]
                .replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };

  let getCity = (html) => {
    try {
      return html
                .querySelector('.job-link div > span:last-child')
                .innerHTML.match(/(\W+)\</)[1]
                .replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };

  let getVacancyAdded = (html) => {
    try {
      return html
                .querySelector('.job-link div > span:last-child')
                .innerHTML.match(/.*span\>(.*)/)[1]
                .replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };

  let getLink = (html) => {
    try {
      return html
                .querySelector('.job-link a')
                .href
                .replace('&nbsp;',' ');
    } catch(e) {
      return 'Unknown';
    }
  };
  
  const records = {data:[], isNextPage:false};
  let jobVacancyList = document.querySelectorAll('.job-link');
  for(let i = 0; i < jobVacancyList.length; ++i) {
    records.data.push({
      position:getPosition(jobVacancyList[i]),
      company:getCompany(jobVacancyList[i]),
      price:getPrice(jobVacancyList[i]),
      city:getCity(jobVacancyList[i]),
      link:getLink(jobVacancyList[i]),
      vacancy_added:getVacancyAdded(jobVacancyList[i])
    });
  }
  let isNextPage = document.querySelector('.pagination li.no-style:last-child > a');
  if(isNextPage != null && isNextPage.textContent == 'Следующая') {
    records.isNextPage = true;
  } else {
    records.isNextPage = false;
  }
  return records;
};

function getMainPage() {
  return new Promise((resolve, reject) => {
    nightmare
      .goto('https://www.work.ua/')
      .type('#search', POSITION)
      .click('.input-search-city .link-close')
      .type('.js-main-region', CITY)
      .click('#sm-but')
      .wait('.job-link')
      .scrollIntoView('.pagination')
      .wait(1500)
      .evaluate(scrabbleInHtml)
      .then(data => resolve(data))
      .catch((error) => {
        console.error('Search failed:', error);
      });
  });
}

function getNextPage() {
  return new Promise((resolve, reject) => {
    nightmare
      .click('.pagination li.no-style:last-child > a')
      .wait('.job-link')
      .scrollIntoView('.pagination')
      .wait(1500)
      .evaluate(scrabbleInHtml)
      .then(data => resolve(data))
      .catch((error) => {
        console.error('Search failed:', error);
      });
  });
}

async function parsJob() {
  try {
    var writer = csvWriter({headers: ["position", "company", "city", "vacancy_added",  "price", "link"]})
    writer.pipe(fs.createWriteStream(FILE_NAME)); 
    let obj = await getMainPage();
    for(let index in obj.data) {
      if(Object.keys(obj.data[index]).length > 0) {
        writer.write(obj.data[index]);
      }
    }
    while(obj.isNextPage) {
      obj = await getNextPage();
      for(let index in obj.data) {
        if(Object.keys(obj.data[index]).length > 0) {
          writer.write(obj.data[index]);
        }
      }
    }
    writer.end();
    
  } catch(e) {
    console.error(e);
  }
}

parsJob().then(res => {
  nightmare
          .end()
          .then(() => {
            console.error('Parsing is complete');
          })
          .catch((error) => {
            console.error('Search failed:', error);
          });
});