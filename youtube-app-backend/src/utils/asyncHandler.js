// these are the two approaches to handle the asynchronous functions in the express.js
// we actually create this utility to use it everywhere and  dont write it everywhere in the code

//  we can use one of the following two approaches
// 1. using Promise.resolve and reject/catch
// 2. using async/await with try catch

// ist method
// const asyncHandler = (fn) => {
//     return (req, resp, next) => {
//         Promise.resolve(fn(req, resp, next)).catch((error) => next(error));
//     }
// }


// 2nd method
const asyncHandler = (fn) => async(req, resp, next) => {

    try {
        await fn(req, resp, next);
    } catch (error) {
       resp.status(error.code || 500).json({
        success: false,
        message: error.message,
       });
    }
}

export default asyncHandler;