import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IEdgarAcademicYear } from "../Models/Database/Edgar/IEdgarAcademicYear.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";

export class EdgarController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,
        basePath: string = "",
    ) {
        super(basePath);
    }

    @Get("courses")
    public async getCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
        const courses: IEdgarCourse[] = (await this.dbConn.doQuery<IEdgarCourse>(
            `SELECT *
            FROM public.course`
        ))?.rows ?? [];

        res
            .status(200)
            .json(courses);
    }
    
    @Get("academic-years")
    public async getAcademicYears(req: Request, res: Response, next: NextFunction): Promise<void> {
        const academicYears: IEdgarAcademicYear[] = (await this.dbConn.doQuery<IEdgarAcademicYear>(
            `SELECT *
            FROM public.academic_year`
        ))?.rows ?? [];

        res
            .status(200)
            .json(academicYears);
    }

    @Get("course/:idCourse/nodes")
    public async getCourseDeclaredNodes(req: Request, res: Response, next: NextFunction): Promise<void> {
        const idCourse = req.params['idCourse'];
        if ((idCourse ?? null) === null) {
            res.sendStatus(400);
            return;
        }

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

        res.send(courseNodes);
    }
}
