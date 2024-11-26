import { html, $signal, createRoot, $ref } from "../core/index.js";
import LandingPage from "./components/landing.js";

function App(){
      const file = $signal('');
      const md = $ref();
      const root = $ref();

      window.addEventListener('popstate', (e) => {
            md.element.style.display = 'none';
            root.element.style.display = 'block';
      })
      
      return html`
            <div ref=${root}>
                 <${LandingPage({ 
                        goto: async route => {
                              if( route === 'api' ){ 
                                    file.value = './contents/docs.md';
                                    history.pushState(null, null, '#api');
                              }else{
                                    file.value = './contents/todo.md';
                                    history.pushState(null, null, '#todo');
                              }
                              md.element.style.display = 'block';
                              root.element.style.display = 'none';
                        }
                  })}/> 
            </div>
            <md-block ref=${md} src=${file} style="display: none"></md-block>
      `;
}

createRoot( App(), document.body );