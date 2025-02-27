export const FACETS_TEMPLATE = `
  <ul class="addsearch-hierarchical-facets">
    {{#each facets}}
      {{> subHierarchicalFacetsTemplate this }}
    {{/each}}
  </div>
`;

export const SUB_HIERARCHICAL_FACETS_TEMPLATE = `
  <li>
    <div class="adds-facet-wrap {{#if (validateOpenState value)}}shrink{{/if}}" data-facet="{{value}}">
      <div class="adds-facet-container">
      <span class="addsearch-facet-group-expansion-arrow {{#unless children}}adds-visibility-hidden{{/unless}}"></span>
      <label title="{{displayValue}}({{count}})">
        <input type="checkbox" value="{{value}}" data-field="{{field}}" />
        <span>{{displayValue}}</span> <em>({{count}})</em>
      </label>
      </div>
      {{#if children}}
        <ul class="addsearch-facet-child-container">
          {{#each children}}
            {{> subHierarchicalFacetsTemplate this }}
          {{/each}}
        </ul>
      {{/if}}
    </div>
  </li>
`;
