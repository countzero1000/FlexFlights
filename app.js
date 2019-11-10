const Axios = require("axios");
const Mongoose = require('mongoose');
const Flight = require('./models/flight');
const Express = require('express');
const User = require('./models/user');
const Order = require('./models/order');
const bodyParser = require('body-parser');
const Twilio = require('twilio');

var accountSid = 'AC1a81c53afa40a9386e61e993dc946d80';
var authToken = 'ceb58961f06b00eea14f3e54e5d8815d';


var client = new Twilio(accountSid,authToken);




const mongoUri = 'mongodb+srv://Admin:kf4kRtV3ElyyBQle@cluster0-asawa.gcp.mongodb.net/test?retryWrites=true&w=majority';
const mongoOptions = {
    useUnifiedTopology: true,
    useNewUrlParser: true
}

Mongoose.connect(mongoUri, mongoOptions)

let app = Express();
app.use(bodyParser.urlencoded({ extended: false }))


numOfDays = (startDate) => {

    switch (startDate.month) {

        case 1: return 31
        case 2: return (startDate.year % 4 == 0) ? 29 : 28
        case 3: return 31
        case 4: return 30
        case 5: return 31
        case 6: return 30
        case 7: return 31
        case 8: return 31
        case 9: return 30
        case 10: return 31
        case 11: return 30
        case 12: return 31
    }

}

convertDateToObject = (string) => {



    let items = string.split('-');

    let date = {
        year: parseInt(items[0]),
        month: parseInt(items[1]),
        day: parseInt(items[2])
    }

    return date;
}

checkInRange = (order, flight) => {

    let startDate = convertDateToObject(order.startDate);
    let endDate = convertDateToObject(order.endDate);
    let flightDate = convertDateToObject(flight.date);

    startDate = new Date(startDate.year,startDate.month,startDate.day);
    endDate = new Date(endDate.year,endDate.month,endDate.day);
    flightDate = new Date(flightDate.year,flightDate.month,flightDate.day);

    

    

    if(startDate.getTime()<=flightDate.getTime() && endDate.getTime()>=flightDate.getTime()){
        return true
    }

    return false;

}


makeUri = (date) => {

    let uri = "https://testflightdata.herokuapp.com/flights?date="

    uri += convertDate(date);

    return uri;

}

convertDate = (date) => {

    let uri = "";

    uri += date.year
    uri += "-"
    uri += date.month
    uri += "-"


    if (date.day < 10) {

        uri += '0' + date.day;

    } else {
        uri += date.day
    }

    return uri;

}

incrementDayX = (date, x) => {
    for (let i = 0; i < x; i++) {
        date = incrementDay(date);
    }
    return date;
}

incrementDay = (date) => {

    let newDate = {
        month: date.month,
        year: date.year,
        day: date.day
    }

    if (newDate.day + 1 > numOfDays(date)) {

        newDate.day = 1

        if (newDate.month + 1 > 12) {

            newDate.month = 1;
            newDate.year += 1;

        } else
            newDate.month += 1;



    } else {
        newDate.day += 1
    }

    return newDate;

}



getFlightsForWeek = (startDate) => {

    let flightsFound = [];

    return new Promise(async (resolve, reject) => {

        for (let i = 0; i < 7; i++) {

            let uri = makeUri(startDate);


            await Axios.get(uri).then((flights) => {
                flights.data.forEach(

                    (flight) => {

                        let totalCap = flight.aircraft.passengerCapacity.total;

                        let decayConstant = Math.random() * .3 + .2;


                        flight.remainingCap = Math.round((totalCap - 110) * Math.pow(decayConstant, 7 - i));

                        flight.date = convertDate(startDate);

                        flight.price = Math.round(flight.distance * Math.pow(decayConstant + .3, 7 - i));

                        if (flight.remainingCap != 0) {

                            flightsFound.push(flight);
                        }
                    }
                )
            });

            startDate = incrementDay(startDate);
        }

        resolve(flightsFound);
    });
}

let order1 = {
    startDate: "2019-11-09",
    endDate: "2019-12-9",
    origin: "LAX",
    destination: "DFW",
    user: "Edward"
}

let orders = [];


orders.push(order1);


let startDate = {
    month: 11,
    day: 9,
    year: 2019
}


arrayContains = (arr, search) =>{

    arr.forEach((item)=>{
        if(toString(item) === toString(search)) return true;
    })

    return false;

}

saveFlight = (flight) => {



    return new Promise(async (resolve, reject) => {

        let mongoFlight = new Flight({

            _id: new Mongoose.Types.ObjectId,
            date: flight.date,
            origin: flight.origin.code,
            destination: flight.destination.code,
            price: flight.price,
            flightNumber: flight.flightNumber,
            duration: flight.duration.locale,
            remainingSeats: flight.remainingCap

        })

        await mongoFlight.save()
            .then(resolve());

    })
}


readInNewFlights = async (startDate) => {


    Mongoose.connection.db
        .listCollections()
        .toArray((err, items) => {
            if (err) console.log(err)
            if (items
                .map((item) => { return item.name })
                .indexOf('flights') != -1) {
                Mongoose.connection.db.dropCollection('flights');
            }
        })

    console.log("connected!!");

    let flights = await getFlightsForWeek(startDate);

    await Promise.all(flights.map(saveFlight));

    console.log("done saving")
}

app.get('/readNewFlightData', (req, res) => {

    readInNewFlights(startDate);
    res.header('Access-Control-Allow-Origin', '*');
    res.send('process starting');
})

app.get('/messageUsers', async (req,res)=>{

    let flights = await Flight.find({});
    let orders = await Order.find({});
    
    let users = [];
    
    for(flight of flights){
        for(order of orders){

          if((flight.destination == order.destination ) && (flight.origin == order.origin) && (checkInRange(order,flight))){
     
                let user = await User.findById(order.user);
                let index = users.map((user)=>{return user.email}).indexOf(user.email);

                if( index == -1){

                    user.flights = [];
                    flights.push(flight);
                    users.push(user);
    
                }else{
                    users[index].flights.push(flight);
                }

            }
        }
    }

   for( user of users){

       await client.messages.create({
            body: 'You have available flex flights!',
            to : "+17372031941",
            from : '+19382385489'
        }).then((message)=>console.log(message.sid)).catch((err)=>{console.log(err)});
    }
    res.header('Access-Control-Allow-Origin', '*');
    res.send('messages sent')

})




app.post('/createUser', (req, res) => {

    let userId = new Mongoose.Types.ObjectId;

    let newUser = new User({
        _id: userId,
        email: req.body.email,
        password: req.body.password,
        phoneNumber: req.body.phoneNumber
    })

    newUser.save();
    res.header('Access-Control-Allow-Origin', '*');
    res.send(userId);

})



app.post('/createOrder',(req,res)=>{

    let endDate = convertDate(incrementDayX(convertDateToObject(req.body.startDate),30));


    let newOrder = new Order({

        _id : new Mongoose.Types.ObjectId,
        startDate : req.body.startDate,
        endDate: endDate,
        origin : req.body.origin,
        destination: req.body.destination,
        user : req.body.userId

    })

    res.header('Access-Control-Allow-Origin', '*');
    newOrder.save();
    res.send(newOrder);

})

app.get('/getOrders', async (req,res)=>{

    let userId = req.query.userId;
    
    let orders = await Order.find({user:userId},(err,orders)=>{
        if(err) res.send(err);
        else
        return orders
    })


    let viewOrders = [];

    for(let i = 0; i < orders.length; i++){

        let order = orders[i]
        
    

        let flights = await Flight
        .find({origin:order.origin,destination:order.destination},(err,flights)=>{

            if(err) console.log(err);

            let validFlight = []
            
            flights.forEach((flight)=>{

                if(checkInRange(order,flight)){
                    validFlight.push(flight);
                }

            })

            return validFlight

        })

        let viewOrder = {
            startDate : order.startDate,
            endDate : order.endDate,
            origin : order.origin,
            destination : order.destination,
            user : order.user,
            flights : flights
        }

        viewOrders.push(viewOrder);
    }   

    console.log(viewOrders);

    res.header('Access-Control-Allow-Origin', '*');
    res.send(viewOrders);
})

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {

    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');

});



