import { NextFunction, Request, Response } from "express";
import { DatabaseConnection } from "../Database/DatabaseConnection.js";
import { Get } from "../Decorators/Get.decorator.js";
import { AbstractController } from "./AbstractController.js";
import { IEdgarAcademicYear } from "../Models/Database/Edgar/IEdgarAcademicYear.js";
import { IEdgarCourse } from "../Models/Database/Edgar/IEdgarCourse.js";

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
}
