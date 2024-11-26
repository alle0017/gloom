import { html, $signal, $effect, $ref, createRoot, css, useLifecycle } from "./core/index.js"
/**@import {Signal} from "./core" */

/**
 * @param {Object} param0
 * @param {string} param0.description 
 * @param {()=>void} param0.onDelete 
 */
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

/**
 * @param {Object} param0
 * @param {Signal<string[]>} param0.list 
 */
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

const NewTodo = useLifecycle( ({ onMount, onDispose }) => ({ onAdded }) => {
      /**
       * @type {Ref<HTMLInputElement>}
       */
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

function App(){
      /**
       * @type {Signal<string[]>}
       */
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
                        /**@param {string} d*/
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