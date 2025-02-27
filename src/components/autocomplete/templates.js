export const AUTOCOMPLETE_TEMPLATE = `
  <div class="addsearch-autocomplete">
    {{#gt suggestions.length 0}}
      <ul class="suggestions">
        {{#each ../suggestions}}
          <li data-keyword="{{value}}" data-index="{{@index}}" {{#equals ../../activeSuggestionIndex @index}}class="active"{{/equals}}>
            {{value}}
          </li>
        {{/each}}
      </ul>
    {{/gt}}
    {{#gt customFields.length 0}}
      <ul class="suggestions">
        {{#each ../customFields}}
          <li data-keyword="{{value}}" data-index="{{@index}}" {{#equals ../../activeSuggestionIndex @index}}class="active"{{/equals}}>
            {{value}}
          </li>
        {{/each}}
      </ul>
    {{/gt}}
  </div>
`;