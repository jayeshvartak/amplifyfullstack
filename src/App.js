import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage, graphqlOperation } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import { onCreateNote, onUpdateNote } from './graphql/subscriptions';

const initialFormState = { name: '', description: '' }

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
    const subscription = API.graphql(graphqlOperation(onCreateNote)).subscribe({
      next: apiData => {
        console.log(apiData);
        fetchNotes();
//        setNotes([ ...notes, apiData.value.data.onCreateCheque ]);
      }
    });

    return () => subscription.unsubscribe(); 
  }, []);




  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name ) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }
  
  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="Note description"
        value={formData.description}
      />
      <input
        type="file"
        onChange={onChange}
      />
      <button onClick={createNote}>Create Note</button>
      <hr></hr>
      <div style={{marginBottom: 30}}>
        {
          notes.filter(note => note.description == "").map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              {
        note.image && <img src={note.image} style={{width: 400}} />
      }
              <button onClick={() => deleteNote(note)}>Delete note</button>
            </div>
          ))
        }
      </div>
      <hr></hr>
      <div>
      <table border="1" align="center">
  <tr>
    <th>Name</th>
    <th>Desc</th>
    <th>Delete</th>
  </tr>

        {
          notes.filter(note => note.description !== "").map(note => (
            
            <tr><td>{note.name}</td>
              <td>{note.description}</td>
              <td>
                <button onClick={() => deleteNote(note)}>Delete note</button>
              </td>
            </tr>

          ))
        }
      </table> 
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
