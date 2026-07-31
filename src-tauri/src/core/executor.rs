use petgraph::graphmap::DiGraphMap;
use petgraph::algo::toposort;
use crate::models::workflow::Workflow;
use crate::core::context::ExecutionContext;
use crate::core::events::{emit_node_event, emit_workflow_event};
use crate::models::runtime::{NodeExecutionEvent, NodeStatus, WorkflowExecutionEvent};
use tauri::AppHandle;
use std::collections::HashMap;

pub async fn execute_workflow(app: AppHandle, workflow: Workflow) -> Result<(), String> {
    let mut graph = DiGraphMap::new();
    let mut node_map = HashMap::new();

    // Populate graph
    for node in &workflow.nodes {
        graph.add_node(node.id.as_str());
        node_map.insert(node.id.as_str(), node);
    }

    for edge in &workflow.edges {
        graph.add_edge(edge.source.as_str(), edge.target.as_str(), ());
    }

    // Topological sort to find execution order
    let sorted_nodes = match toposort(&graph, None) {
        Ok(sorted) => sorted,
        Err(_) => return Err("Cycle detected in workflow DAG".into()),
    };

    let mut ctx = ExecutionContext::new();

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Running,
    });

    for node_id in sorted_nodes {
        let node = node_map.get(node_id).unwrap();

        emit_node_event(&app, &NodeExecutionEvent {
            workflow_id: workflow.id.clone(),
            node_id: node.id.clone(),
            status: NodeStatus::Running,
            result: None,
            error: None,
        });

        // Here we would call the actual Plugin Registry to execute the node.
        // For now, we simulate success.
        
        let dummy_result = serde_json::json!({"status": "ok"});
        ctx.set_node_result(&node.id, dummy_result.clone());

        emit_node_event(&app, &NodeExecutionEvent {
            workflow_id: workflow.id.clone(),
            node_id: node.id.clone(),
            status: NodeStatus::Success,
            result: Some(dummy_result),
            error: None,
        });
    }

    emit_workflow_event(&app, &WorkflowExecutionEvent {
        workflow_id: workflow.id.clone(),
        status: NodeStatus::Success,
    });

    Ok(())
}
