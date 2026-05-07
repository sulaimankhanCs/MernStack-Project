import { useEffect, useState } from 'react'
import axios from 'axios';

function App() {
  const [users, setUsers] = useState();

  useEffect(() => {
    axios.get('/api/v1/users')
    .then(response => {
      setUsers(response.data);
      console.log(response.data);
    })
    .catch(error => {
      console.error('Error fetching users:', error);
    });
  }, []);

  return (
    <>
    <h1>hello users!</h1>
    <div>
    {users && users.length > 0 ? (
  users.map((user) => (
    <div key={user.id}>
      <h3>User Name: {user.name}</h3>
      <h4>User ID: {user.id}</h4>
      <h5>User Email: {user.email}</h5>
    </div>
  ))
) : (
  <p>No users found</p>
)}
    </div>
    </>
  )
}

export default App
