export const PAGINATION_TEMPLATE = `
  <div class="addsearch-pagination">
    {{#gt currentPage 1}}
      <button data-page="previous" aria-label="Previous page">❮</button>
    {{/gt}}
    {{#each pages}}
      <button data-page="{{this}}" aria-label="Go to results page {{this}}" {{#equals ../currentPage this}}data-active="true" aria-current="true"{{/equals}}>
        {{this}}
      </button>
    {{/each}}
    {{#lt currentPage lastPage}}
      <button data-page="next" aria-label="Next page">❯</button>
    {{/lt}}
  </div>
`;