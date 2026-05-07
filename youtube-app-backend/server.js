import express from 'express';
import cors from 'cors';

const app = express();
const Port = process.env.PORT || 3000;
app.use(cors());

app.get('/api/v1/users', (req, res) => {
    const users = [
        { id: 1, name: 'John Doe', email: 'john.doe@example.com' },
        { id: 2, name: 'Jane Doe', email: 'jane.doe@example.com' },
        { id: 3, name: 'John Smith', email: 'john.smith@example.com' },
        { id: 4, name: 'Jane Smith', email: 'jane.smith@example.com' },
    ];
    res.send(users);
});

app.listen(Port, () => {
    console.log(`Server is running on port ${Port}`);
});