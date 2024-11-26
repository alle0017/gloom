import { $effect, $signal, html } from "../../core/index.js";
const snippet = 
`export const Counter = ()=>{

      const name = 'name';
      const counter = $signal(0);
      const count = () => counter.value++;

      return html\`
            <div>hello \${name}</div>
                  \${counter}
            <button @click=\${count}>add</button>
      \`;
}`
/**
 * 
 * @param {Object} param0 
 * @param {(route: string)=>Promise<void>} param0.goto 
 * 
 * @returns 
 */
export default function LandingPage({ goto }){
      const width = $signal(window.innerWidth);
      const tableRowClass = $effect(
            () => width.value < 1080 ? '': 'splitted-tr',
            width,
      );

      

      window.addEventListener( 'resize', () => width.value = window.innerWidth );

      return html`
            <div class="landing-container">
                  <img src="./assets/gloom.webp" width="300"/>
                  <br/>
                  <div class="title">
                        Gloom.js
                  </div>
                  <div class="subtitle">
                        Develop faster than light
                  </div>
                  <div id="landing-buttons" class="tr">
                        <button id="api-reference" class="td" @click=${() => goto('api')}>
                              API Reference
                        </button>
                        <button class="td" @click=${() => goto('todo-app')}>
                              example
                        </button>
                  </div>
            </div>
            <div class="${tableRowClass}">
                  <div class="td">
                        <pre class="language-javascript"><code>${snippet}</code></pre>
                  </div>
                  <div class="td">
                        <div class="section">
                              <div class="subtitle">
                                    Write Your Components
                              </div>
                              <div class="subsection">
                                    Write components with pure, functional-like style, inspired by
                                    React and similar.
                              </div>
                        </div>
                        <div class="section">
                              <div class="subtitle">
                                    No Fancy Compilations
                              </div>
                              <div class="subsection">
                                    <a>Gloom</a>, instead of jsx, use template strings, 
                                    that doesn't require a building step, boosting your productivity.
                              </div>
                        </div>
                        <div class="section">
                              <div class="subtitle">
                                    No vdom
                              </div>
                              <div class="subsection">
                                    <a>Gloom</a> doesn't use directly a vdom. Instead, it creates a lightweight representation
                                    of the html, unique for all the components that shares the same structure, than modify only the parts 
                                    that where interpolated initially, allowing efficient reload.
                              </div>
                        </div>
                        <div class="section">
                              <div class="subtitle">
                                    No implicit reactivity
                              </div>
                              <div class="subsection">
                                    With is minimal style, <a>Gloom</a> doesn't insert directly any reactivity. This
                                    allows more control over the reloading system and a better debug/refactor experience.
                              </div>
                        </div>
                  </div>
            </div>
      `
}