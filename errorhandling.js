const axios = require("axios");

let promises = [];
// async function getGoogle() {
//     await axios.get('https://google.com/');
// }
// promises.push(new Promise((resolve, reject) => {
//     //throw new Error("promise 1 error");
//     axios.get('https://google.com').then(() => {
//         resolve("1");
//     })
// }));

// let promiseOne = new Promise((resolve, reject) => {
//     axios.get('https://vnexpress.net').then(() => {
//         resolve("2");
//     }).catch(e => {
//         console.log('error');
//     })
// })

// promiseOne.then(() => {
//     setTimeout(() => {
//         null.a = 1;
//     }, 3000);
// })

// promises.push(promiseOne);

// Promise.all(promises).then(() => {
//     console.log('all promises are resolved');
// }).catch(e => {
//     console.log('Error occured');
// })

async function awaitOne() {
    console.log("awaitOne started");
    null.a = 1;
    await axios.get('https://google.com');
    await axios.get("https://deelay.me/5000/https://picsum.photos/200/300");
    //throw new Error('error here');
    console.log("await one resolved")
}

async function awaitTwo() {
    console.log("await two");
    await axios.get('https://vnexpress.net')
}

(async () => {
    // let pros = awaitOne();
    // console.log(pros);
    // promises.push(pros);
    // console.log("running here");
    // promises.push(awaitTwo());
    // //await Promise.resolve(1);
    // try {
    //     await axios.get("https://vnexpress.net");
    //     await Promise.all(promises).then(() => {
    //         console.log('all promises are resolved')
    //     });
    // } catch (e) {
    //     console.log(e.message);
    //     console.log("error", "background: black;color:red")
    // }

    setTimeout(() => {
        console.log('running here')
    }, 100);

    await axios.get('https://vnexpress.net');
    console.log("asdasd")
})();

// var p1 = new Promise((resolve, reject) => {
//     setTimeout(() => resolve('one'), 1000);
// });
// var p2 = new Promise((resolve, reject) => {
//     setTimeout(() => resolve('two'), 2000);
// });
// var p3 = new Promise((resolve, reject) => {
//     setTimeout(() => resolve('three'), 3000);
// });
// var p4 = new Promise((resolve, reject) => {
//     setTimeout(() => resolve('four'), 4000);
// });
// var p5 = new Promise((resolve, reject) => {
//     reject(new Error('reject'));
// });

// // Using .catch:
// Promise.all([p1, p2, p3, p4, p5])
//     .then(values => {
//         console.log(values);
//     })
//     .catch(error => {
//         console.error(error.message)
//     });