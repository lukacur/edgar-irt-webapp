import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IEdgarCourse } from '../models/edgar/course.model';
import { environment } from 'src/environments/environment';
import { ICourseCalculation } from '../models/statistics-processing/course-calculation.model';
import { ICourseLevelStatisticsCalculation } from '../models/statistics-processing/course-level-statistics-calculation.model';
import { ITestLevelStatisticsCalculation } from '../models/statistics-processing/test-level-statistics-calculation.model';
import { IQuestionIrtParameters } from '../models/irt/question-irt-parameters.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {

  constructor(
    private readonly http: HttpClient,
  ) { }

  getCoursesWithCalculatedStatistics(): Observable<IEdgarCourse[]> {
    return this.http
      .get<IEdgarCourse[]>(`${environment.backendServerInfo.applicationAddress}/statprocessing/courses`)
      .pipe(tap(d => console.log(d)));
  }

  getCourseCalculations(idCourse: number): Observable<ICourseCalculation[]> {
    return this.http
      .get<ICourseCalculation[]>(
        `${environment.backendServerInfo.applicationAddress}/statprocessing/${idCourse}/calculations`
      )
      .pipe(tap(d => console.log(d)));
  }

  getCourseLevelCalculations(calcGroup: string): Observable<ICourseLevelStatisticsCalculation[]> {
    return this.http
      .get<ICourseLevelStatisticsCalculation[]>(
        `${environment.backendServerInfo.applicationAddress}/statprocessing/calculations/${calcGroup}/course-level`
      );
  }

  getTestLevelCalculations(calcGroup: string): Observable<ITestLevelStatisticsCalculation[]> {
    return this.http
      .get<ITestLevelStatisticsCalculation[]>(
        `${environment.backendServerInfo.applicationAddress}/statprocessing/calculations/${calcGroup}/test-level`
      );
  }


  getQuestionIRTParameters(idQuestion: number): Observable<IQuestionIrtParameters[]> {
    return this.http
      .get<IQuestionIrtParameters[]>(
        `${environment.backendServerInfo.applicationAddress}/statprocessing/${idQuestion}/irt-parameters`
      );
  }
}
