<div class="title">Todo App</div>

to explore all the functionalities of the framework, let's build a simple todo app

## the todo 

first, we need to create the component that will hold our todo

```javascript
function TodoItem({ description, onDelete }){
      
      return html`
            <span key=${style}></span>
            <div>
                  <p>${description}</p>
                  <button @click=${ onDelete }> delete </button>
            </div>
      `;
}
```

i don't like unstyled stuff, so let's add some style to our code.
the `css` function scopes the css and return a key to the scoped style.

```javascript
function TodoItem({ description, onDelete }){
            const style = css`     
            div {
                  border-radius: 10px;
                  width: 300px;
                  min-height: 50px;
                  border: 2px solid black;
                  margin-top: 20px;
                  padding: 10px;
            }

            button {
                  height: 24px;
                  width: 75px;
                  max-width: 75px;
                  font-size: 14px;
                  font-weight: bolder;
                  text-transform: uppercase;
                  border-radius: 2%;
                  color: red;
                  border: 2px solid red;
                  margin-left: calc(300px - 85px)
            }
      `;
      return html`
            <span key=${style}></span>
            <div>
                  <p>${description}</p>
                  <button @click=${ onDelete }> delete </button>
            </div>
      `;
}
```



## the todo list

than we need to create a list that will hold our todo list. note that list must be a `Signal&lt;string[]>` to be passed to the `TodoList` component, so, if you choose to use typescript or jsdoc, you'll have all the benefits of first-class type-safe project. here we have used the `map` method of the `Signal` type to render the list of todos as a TodoItem component

```javascript
function TodoList({ list }){
      /**
       * 
       * @param {number} i 
       */
      const onDelete = i => {
            list.value.splice( i, 1 );
            list.value = list.value;
      }

      return list.map( 
            (v,i) => TodoItem({ description: v, onDelete: () => onDelete(i) }) 
      )
}
```

## add new todo 

now that we have created how the `TodoList` is displayed, we need a way to create new todo's. we use the `$ref` hook to give to the todo a low level access to the input tag. We also used the useLifecycle hook to create a lifecycle-bound component. 

```javascript
const NewTodo = useLifecycle( ({ onMount, onDispose }) => ({ onAdded }) => {
      const input = $ref();

      const add = () => { 
            if(!input.element.value)
                  return;

            onAdded(input.element.value); 
            input.element.value = '';
      }
      const shortcut = e => e.key == 'Enter' && add();

      onMount(() => {
            document.addEventListener( 'keydown', shortcut );
      });

      onDispose(() => {
            document.removeEventListener( 'keydown', shortcut );
      });


      const style = css`
            input {
                  border-radius: 10px;
                  width: 230px;
                  border: 2px solid black;
                  height: 18px;
            }

            input:focus {
                  outline: none;
            }

            button {
                  height: 24px;
                  width: 60px;
                  max-width: 60px;
                  font-size: 14px;
                  font-weight: bolder;
                  text-transform: uppercase;
                  border-radius: 2%;
                  color: black;
                  border: 2px solid black;
            }
      `;

      return html`
                  <style key=${style}></style>
                  <input ref=${input} type="text" placeholder="new" value=""/>
                  <button @click=${add} >
                        add
                  </button>
            `
});
```


## finally, the app

```javascript
function App(){
      const todoList = $signal([]);
      const style = css`
            div {
                  width: 400px;
                  border: 2px solid black;
                  padding: 5%;
                  border-radius: 2%;
                  height: 500px;
                  overflow: scroll;
            }
      `;

      return html`
            <style key=${style}></style>
            <div>
                  <${NewTodo({ 
                        onAdded: d => {
                              todoList.value.push(d)
                              todoList.value = todoList.value;
                        }
                  })}/>

                  <${TodoList({ list: todoList })}/>
            </div>
      `
}
createRoot( App(), document.body );
```