import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IEdgarAcademicYear } from "../Models/Database/Edgar/IEdgarAcademicYear.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";
import { IEdgarNode } from "../Models/Database/Edgar/IEdgarNode.js";
import { CourseService } from "../Services/CourseService.js";

export class EdgarController extends AbstractController {
    constructor(
        private readonly dbConn: DatabaseConnection,
        private readonly courseService: CourseService,
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

        const courseNodes: IEdgarNode[] = await this.courseService.getCourseNodes(parseInt(idCourse));

        res.send(courseNodes);
    }
}
