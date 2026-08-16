/**
 * MYND BFF — Mock Knowledge/Graph Provider
 * @implements {import('../interfaces').KnowledgeProvider}
 */
const mockKnowledgeProvider = {
  async getConnections(objectId) {
    const connectionMap = {
      'obj_car_1': [
        { id: 'obj_car_2', type: 'code', title: 'Kalyra Engine — Architecture', relationship: 'references' },
        { id: 'obj_car_3', type: 'note', title: 'Google Interview Prep — Notes', relationship: 'related' }
      ],
      'obj_car_2': [
        { id: 'obj_car_1', type: 'document', title: 'Resume 2026 Final Draft', relationship: 'referenced_by' }
      ],
      'obj_res_1': [
        { id: 'obj_res_2', type: 'document', title: 'Spatial Memory in LLM Agents', relationship: 'cites' }
      ],
      'obj_lrn_1': [
        { id: 'obj_lrn_3', type: 'note', title: 'Neural Networks', relationship: 'related' }
      ]
    };
    return connectionMap[objectId] || [];
  },

  async getGraph(spaceId) {
    const graphs = {
      'space_career': {
        nodes: [
          { id: 'obj_car_1', label: 'Resume 2026', type: 'document', spaceId: 'space_career' },
          { id: 'obj_car_2', label: 'Kalyra Engine', type: 'code', spaceId: 'space_career' },
          { id: 'obj_car_3', label: 'Interview Prep', type: 'note', spaceId: 'space_career' }
        ],
        edges: [
          { source: 'obj_car_1', target: 'obj_car_2', relationship: 'references', weight: 0.9 },
          { source: 'obj_car_1', target: 'obj_car_3', relationship: 'related', weight: 0.7 }
        ]
      },
      'space_learning': {
        nodes: [
          { id: 'obj_lrn_1', label: 'Time Complexity', type: 'note', spaceId: 'space_learning' },
          { id: 'obj_lrn_2', label: 'Ownership in Rust', type: 'note', spaceId: 'space_learning' },
          { id: 'obj_lrn_3', label: 'Neural Networks', type: 'note', spaceId: 'space_learning' }
        ],
        edges: [
          { source: 'obj_lrn_1', target: 'obj_lrn_3', relationship: 'related', weight: 0.6 }
        ]
      }
    };
    return graphs[spaceId] || { nodes: [], edges: [] };
  }
};

module.exports = mockKnowledgeProvider;
