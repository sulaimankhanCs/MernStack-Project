import multer from 'multer';

//we will use this as a middleware to upload files to the server
// it will store the files in the public/temp folder
// it will generate a unique file name, path, type , size for the file and will return it to the client
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix)
    }
  })
  
export const upload = multer({ storage });