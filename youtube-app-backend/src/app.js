import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

const app = express();

// app.use(cors()); we can use only this line if we want to allow all origins

// but if we want to allow only specific origins, we can use the following code
app.use(cors({
    origin: process.env.CORS_ORIGIN, // this is the origin of the client
    credentials: true,
}));
app.use(express.json({ limit: '16kb' })); // express.json is used to parse the json data from the request
// express.urlencoded is used to parse the url encoded data from the request
app.use(express.urlencoded({ extended: true, limit: '16kb' })); //extended: true is used to allow nested objects and arrays
app.use(cookieParser()); // cookieParser is used to parse the cookies from the request
app.use(express.static('public')); // express.static is used to serve the static files from the public folder

//routes imports
import userRouter from './routes/user.route.js';

//routes middleware
app.use('/api/v1/users', userRouter);


export default app;
