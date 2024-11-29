# gloom.js

> gloom.js (pronounced /gluːm/) is a fast, yet powerful frontend framework.

in particular, it relies on declarative component. The components are written as template strings. The syntax is inspired by react, with some features of vue and svelte.

### reactivity

Gloom uses reactivity-based rendering, like solid.js, to declare parts of the code that are reactive. The fact that all the code is written in pure JavaScript, without jsx or custom files, make the reactivity available in all the project. The reactivity, like other modern frameworks, doesn't trigger the reload of all the component, instead, it only updates the 'hot' part of the component. Reactivity is implemented with a signal based engine. The atomic components are:


```javascript
class Signal<T> {
      value: T;
      
      map<V>( (value: T) => V ): Effect<V>
      // this overload is used if T is an array
      map<T extends Array<infer K>, V>( (value: K, i: number) => V ): Effect<V>
}
```

```javascript
class Effect<T> {
      // state is available and contains 
      //a memoized result of the callback, but should not be used
      state: T;      
}
```

> Signal and Effect class as also other properties/methods that should be ignored

Gloom, although is implemented as a class based framework internally, exposes only functional API. The available api are:

- `$signal<T>( value: T ): Signal<T>`: Each time the value changes, triggers the reload of all the components that uses the state. To achieve hot reload in components you should interpolate the signal itself, not the value.

- `$effect<T>( () => T, ...dependencies: Reactive<unknown>[] ): Effect<T>`: the effect hooks is a sort of `computedProperty`, which, as Signals, updates the DOM each time one of the dependencies changes.

- `$ref<T extends HTMLElement>(): Ref<T>`: gives the possibility to get the reference to a concrete DOM element. is something like `<div ref="myRef">` in vue. To access the Element, the Ref interface exposes the Ref.element property. To use it, you can pass it as any attribute of the tag you want to reference.

> **Note:** `$ref` will not be executed on gloom custom components because they aren't, logically, true components, rather than a tree representation of a component.

- `useLifecycle<T>(factory: (on: LifecycleHook) => ((args: T) => Component)) => (args: T) => Component`: the function passed as argument get as input the functions that can be used to handle lifecycle of component:\
      . `onMount(()=>void): void`: called when the component is mounted\
      . `onDispose(()=>void): void`: called to executes clean-up after the component is unmounted\
      . `onError( (e: Error)=>void ): void`: called when an error happens during the component mount/update phase

- `createContext<T extends {}>(context: T): () => T`: create a function that, similar to react createContext, can be shared in all your code to get a contextual object.
- `GApp`: object that contains 2 methods:
      . `createRoot( Component, HTMLElement ): void` attaches a virtual tree of Components to the DOM
      . `registerComponent(component: (args: Record<string, unknown> ) => Component, name?: string ): typeof GApp` : !EXPERIMENTAL! register a component function, so that, if you use the tag in the html, the registered function is called instead. Like:
      ```javascript
      // watch the todo app for comparison
      html`
            <style key=${style}></style>
            <div>
                  <NewTodo onAdded=${/**@param {string} d*/ d => {
                        todoList.value.push(d)
                        todoList.value = todoList.value;
                  }}/>
                  <TodoList list=${todoList}/>
            </div>
      `
      // when creating the app
      GApp
      // this is mandatory, otherwise the NewTodo registration will throw 
      // an error, caused by the fact that high-order function returns 
      // unnamed functions
      .registerComponent( NewTodo, 'NewTodo' )
      .registerComponent(TodoList)
      .createRoot(App(), document.body)
      ```

- `css`: tag function that returns a scoped css key, that can be used to style your component


## examples
 
After this introduction, let's look at how the code looks like in gloom.

### simple component declaration

components are declared as functions that return a string template, wrapped by the `html` tag function

> Note: `@[event]` is used to declare events that will be attached to actual components.

```javascript
export const Counter = ()=>{

      const name = 'name';
      const counter = $signal(0);
      const count = () => counter.value++;

      return html`
            <div>hello ${name}</div>
                  ${counter}
            <button @click=${count}>add</button>
      `;
}
```

or better, with properties

```javascript
export const Counter = ({ name, initialValue })=>{

      const counter = $signal(initialValue);
      const count = () => counter.value++;

      return html`
            <div>hello ${name}</div>
                  ${counter}
            <button @click=${count}>add</button>
      `;
}
```

> **Note:** as React does, we suggest to use objects as parameters, to provide better readability overall.
> **Note:** As we will see below, components are completely **immutable**, except for signals and effects, so props changes doesn't triggers reloading.


### use a component 

using a component can be done in different ways. Each component abstraction has it's tree structure, that is concretize only on a reload or when the `createRoot` function is called. You can use the component as a function called directly in other components:

```javascript
export const CounterWrapper = ()=>{

      return html`
            <div>
                  <${Counter({ name: 'myFirstComponent', initialValue: 0 })}/>
            </div>
      `;
}
```

or by calling the component before the use: 

```javascript
export const CounterWrapper = ()=>{

      const counter = Counter({ name: 'myFirstComponent', initialValue: 0 });

      return html`
            <div>
                  <${counter}/> //it's the same component that will be rendered two times, with shared states etc...
                  <${counter}/>
            </div>
      `;
}
```

or by passing it to the `createRoot`:

```javascript
createRoot(Counter({ name: 'myFirstComponent', initialValue: 0}), document.body );
```

### children

We said that the components are immutable. This is demonstrated by the fact that, if you want to pass children to a component, you can only assign to them a (one or more) root, with the special tag `<Children/>` (is case sensitive). To do this, you can do as follows:

```javascript

function ChildrenWrapper(){
      return html`
            <Children/>
            <Children/>
      `;
}

function Component(){
      return html`
            <${ChildrenWrapper()}>
                  <button>${'press me'}</button>
            </ChildrenWrapper>
      `;
}
```

> **Note:** for performance reasons, the `html` function, on tree building, doesn't check that all the tags have a corresponding closing tag, it just control that the number of opened tags is the number of closed tags. 

### conditional rendering

to control the rendering of a component, you can use ternary operator to decide whether branch of the tree render.

```javascript
export const IsTrueOrFalse = ({ flag })=>{

      return html`
            <ul>
                  <${flag? html`<div>true</div>`: html`<div>false</div>`}/>
            </ul>
      `;
}
```

### rendering a list

One of the most important features of frameworks is that can render a list. For example, let's say we want to render a list of names, we can do as follow: 

```javascript
export const List = ()=>{

      const names = ['john', 'Carl', 'Bob',];

      return html`
            <ul>
                  <${names.map( name => html`<li>${name}</li>` )}/>
            </ul>
      `;
}
```

> **Note:** the li is the same component, rendered multiple times. It doesn't matter how many times you call it, it will not trigger the parsing phase as long as the structure of the template does not change.

if you want to render a list of names that reloads reactively, than you have to use state-effect as follows:

```javascript
export const List = ()=>{

      const names = $signal(['john', 'Carl', 'Bob',]);
      const list = $effect(
            () => names.value.map( name => html`<li>${name}</li>` ),
            names,
      );

      return html`
            <ul>
                  <${list}/>
            </ul>
      `;
}
```

or use the map function of Signals for a more concise way:

```javascript
export const List = ()=>{

      const names = $signal(['john', 'Carl', 'Bob',]);

      return html`
            <ul>
                  <${names.map( name => html`<li>${name}</li>` )}/>
            </ul>
      `;
}
```