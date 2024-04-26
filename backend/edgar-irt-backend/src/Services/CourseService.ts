import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";

export class CourseService {
    constructor(
        private readonly dbConn: DatabaseConnection,
    ) {}

    public async getCourseNodes(idCourse: number): Promise<IEdgarNode[]> {
        const courseNodes: IEdgarNode[] = (
            await this.dbConn.doQuery<IEdgarNode>(
                `WITH RECURSIVE course_sub_nodes (id, id_node_type, node_name, description)
                AS(
                    SELECT node.id,
                            node.id_node_type,
                            node.node_name,
                            node.description
                    FROM course
                        JOIN node
                            ON course.id_root_node = node.id
                    WHERE course.id = $1
                
                    UNION

                    SELECT node.id,
                            node.id_node_type,
                            node.node_name,
                            node.description
                    FROM course_sub_nodes
                        JOIN node_parent
                            ON course_sub_nodes.id = node_parent.id_parent
                        JOIN node
                            ON node_parent.id_child = node.id
                ) 
                SELECT course_sub_nodes.*,
                        node_type.type_name AS node_type_name
                FROM course_sub_nodes
                    JOIN node_type
                        ON course_sub_nodes.id_node_type = node_type.id
                ORDER BY course_sub_nodes.node_name`,
                [idCourse]
            )
        )?.rows ?? [];

        return courseNodes;
    }
}
