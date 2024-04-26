import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { IEdgarCourse } from '../models/edgar/course.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { IAcademicYear } from '../models/edgar/academic-year.model';
import { IEdgarNode } from '../models/edgar/node.model';

@Injectable({
  providedIn: 'root'
})
export class EdgarService {

  constructor(
    private readonly http: HttpClient,
  ) { }

  getCourses(): Observable<IEdgarCourse[]> {
    return this.http
      .get<IEdgarCourse[]>(
        `${environment.backendServerInfo.applicationAddress}/courses`
      ).pipe(tap(data => console.log(data)));
  }

  getAcademicYears(): Observable<IAcademicYear[]> {
    return this.http
      .get<IAcademicYear[]>(
        `${environment.backendServerInfo.applicationAddress}/academic-years`
      ).pipe(tap(data => console.log(data)));
  }

  getCourseNodes(idCourse: number): Observable<IEdgarNode[]> {
    return this.http
      .get<IEdgarNode[]>(
        `${environment.backendServerInfo.applicationAddress}/course/${idCourse}/nodes`
      ).pipe(tap(data => console.log(data)));
  }
}
