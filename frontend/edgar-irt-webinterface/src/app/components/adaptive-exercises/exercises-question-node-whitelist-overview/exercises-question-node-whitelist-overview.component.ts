import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, map, Observable, Subscription, take, tap } from 'rxjs';
import { IExerciseDefinition } from 'src/app/models/adaptive-exercises/exercise-definition.model';
import { IEdgarCourse } from 'src/app/models/edgar/course.model';
import { IEdgarNode } from 'src/app/models/edgar/node.model';
import { INodeQuestionClass } from 'src/app/models/exercise-definition/node-question-class.model';
import { AdaptiveExercisesService } from 'src/app/services/adaptive-exercises.service';
import { EdgarService } from 'src/app/services/edgar.service';
import { ExerciseDefinitionServiceService } from 'src/app/services/exercise-definition-service.service';
import { QuestionUtil } from 'src/app/util/question.util';

type CourseQuestionClassInfo = { qClass?: string, qClassCount?: number };

@Component({
    selector: 'app-question-node-whitelist-overview',
    templateUrl: './exercises-question-node-whitelist-overview.component.html',
})
export class ExercisesQuestionNodeWhitelistOverviewComponent implements OnInit, OnDestroy {
    courses$: Observable<{ text: string, course: IEdgarCourse }[]> = new BehaviorSubject([]);
    exerciseDefinitions$: Observable<{ text: string, exDefinition: IExerciseDefinition }[]> = new BehaviorSubject([]);
    selectableNodes$: Observable<{ text: string, node: IEdgarNode }[]> = new BehaviorSubject([]);
    exerciseDefinitionWhitelistedNodes$: Observable<(IEdgarNode & { whitelisted_on: string })[]> =
        new BehaviorSubject([]);

    private byNodeQuestionClasses$: Observable<INodeQuestionClass[]> = new BehaviorSubject([]);

    nodeQuestionClasses: INodeQuestionClass[] = [];
    courseQuestionClasses: CourseQuestionClassInfo[] = [];

    readonly questionClasses = QuestionUtil.getAvailableClasses();
    readonly questionClassColors = QuestionUtil.questionClassHexColors();

    numberOfWhitelistedNodes: number = 0;

    readonly nodeSelectionForm = new FormGroup({
        selectedCourse: new FormControl<IEdgarCourse | null>(null, Validators.required),
        selectedExerciseDefinition: new FormControl<IExerciseDefinition | null>(null, Validators.required),

        toRemoveExerciseDefinitions: new FormControl<IExerciseDefinition[]>([]),

        selectedNodes: new FormControl<IEdgarNode[]>([]),
        toRemoveNodeIds: new FormControl<number[]>([]),

        progressionCustomization: new FormGroup({
            correctAnswersToUpgrade: new FormControl<number>(3, [Validators.min(1)]),
            incorrectAnswersToDowngrade: new FormControl<number>(2, [Validators.min(1)]),
            skippedQuestionsToDowngrade: new FormControl<number>(5, [Validators.min(1)]),
        }),
    });

    readonly subscriptions: Subscription[] = [];

    constructor(
        private adaptiveExercisesService: AdaptiveExercisesService,
        private exerciseDefinitionService: ExerciseDefinitionServiceService,
        private edgarService: EdgarService,
    ) { }

    private reloadComponentData(keepCourse: false): void;
    private reloadComponentData(keepCourse: true, keepExerciseDefinition: boolean): void;
    private reloadComponentData(keepCourse: boolean, keepExerciseDefinition?: boolean): void {
        const courseControl = this.nodeSelectionForm.get('selectedCourse');

        if (!keepCourse) {
            this.courses$ = this.edgarService.getCourses()
                .pipe(
                    map(courses =>
                        courses.map(course => {
                            return {
                                text: `(${course.course_acronym}) ${course.course_name} - ${course.ects_credits} ECTS`,
                                course
                            };
                        })
                    )
                );

            courseControl?.setValue(null);
        } else if ((courseControl?.value ?? null) !== null) {
            const selectedExerciseDefinitionControl = this.nodeSelectionForm.get('selectedExerciseDefinition');

            if (!keepExerciseDefinition) {
                this.exerciseDefinitions$ =
                    this.adaptiveExercisesService.getCourseExerciseDefinitions(courseControl!.value!.id)
                        .pipe(
                            take(1),
                            map(definitions =>
                                definitions.map(exDefinition => {
                                    return {
                                        text: exDefinition.exercise_name,
                                        exDefinition
                                    };
                                })
                            )
                        );

                selectedExerciseDefinitionControl?.setValue(null);
            } else if ((selectedExerciseDefinitionControl?.value ?? null) !== null) {
                this.adaptiveExercisesService.getCourseExerciseDefinitions(courseControl!.value!.id)
                    .pipe(take(1))
                    .subscribe(defs => {
                        selectedExerciseDefinitionControl?.setValue(
                            defs.find(el => el.id === selectedExerciseDefinitionControl.value?.id) ?? null
                        );
                    });

                this.exerciseDefinitionWhitelistedNodes$ =
                    this.adaptiveExercisesService.getExerciseDefinitionNodeWhitelist(
                        selectedExerciseDefinitionControl!.value!.id
                    ).pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));

                    this.byNodeQuestionClasses$ =
                        this.exerciseDefinitionService.getQuestionClassesForDefinition(
                            selectedExerciseDefinitionControl!.value!.id
                        ).pipe(
                            tap(qcls => {
                                this.nodeQuestionClasses = qcls;
                                this.courseQuestionClasses = qcls.reduce(
                                    (acc, el) => {
                                        let found = false;
                                        for (const entry of acc) {
                                            if (entry.qClass === el.class_name) {
                                                entry.qClassCount! += el.number_of_questions;
                                                found = true;
                                                break;
                                            }
                                        }

                                        if (!found) {
                                            const obj: CourseQuestionClassInfo = {
                                                qClass: el.class_name,
                                                qClassCount: el.number_of_questions
                                            };
                                            acc.push(obj);
                                        }

                                        return acc;
                                    },
                                    [] as CourseQuestionClassInfo[]
                                );
                            }),
                        );

                    this.subscriptions.push(this.byNodeQuestionClasses$.subscribe());
            }
        }

        this.nodeSelectionForm.get('toRemoveExerciseDefinitions')?.setValue([]);

        this.nodeSelectionForm.get('selectedNodes')?.setValue([]);
        this.nodeSelectionForm.get('toRemoveNodeIds')?.setValue([]);
    }

    ngOnInit(): void {
        this.reloadComponentData(false);

        const selectedCourseControl = this.nodeSelectionForm.get('selectedCourse');
        const selectedExerciseDefinitionControl = this.nodeSelectionForm.get('selectedExerciseDefinition');
        if (selectedCourseControl !== null && selectedExerciseDefinitionControl !== null) {
            this.subscriptions.push(
                selectedCourseControl.valueChanges
                    .subscribe(crs => {
                        if (crs !== null) {
                            this.exerciseDefinitions$ =
                                this.adaptiveExercisesService.getCourseExerciseDefinitions(crs.id)
                                    .pipe(
                                        take(1),
                                        map(definitions =>
                                            definitions.map(exDefinition => {
                                                return {
                                                    text: exDefinition.exercise_name,
                                                    exDefinition
                                                };
                                            })
                                        )
                                    );
                        }

                        selectedExerciseDefinitionControl.setValue(null);
                    }),

                selectedExerciseDefinitionControl.valueChanges
                    .subscribe(exDef => {
                        if (exDef !== null) {
                            this.selectableNodes$ =
                                this.adaptiveExercisesService.getExerciseDefinitionWhitelistableQuestionNodes(exDef.id)
                                    .pipe(
                                        map(nodes => {
                                            return nodes.map(node => {
                                                return {
                                                    text: `(${node.node_type_name}) - ${node.node_name}`,
                                                    node
                                                };
                                            });
                                        })
                                    );

                            this.exerciseDefinitionWhitelistedNodes$ =
                                this.adaptiveExercisesService.getExerciseDefinitionNodeWhitelist(exDef.id)
                                    .pipe(tap(nodes => this.numberOfWhitelistedNodes = nodes.length));

                            this.byNodeQuestionClasses$ =
                                this.exerciseDefinitionService.getQuestionClassesForDefinition(exDef.id)
                                    .pipe(
                                        tap(qcls => {
                                            this.nodeQuestionClasses = qcls;
                                            this.courseQuestionClasses = qcls.reduce(
                                                (acc, el) => {
                                                    let found = false;
                                                    for (const entry of acc) {
                                                        if (entry.qClass === el.class_name) {
                                                            entry.qClassCount! += el.number_of_questions;
                                                            found = true;
                                                            break;
                                                        }
                                                    }

                                                    if (!found) {
                                                        const obj: CourseQuestionClassInfo = {
                                                            qClass: el.class_name,
                                                            qClassCount: el.number_of_questions
                                                        };
                                                        acc.push(obj);
                                                    }

                                                    return acc;
                                                },
                                                [] as CourseQuestionClassInfo[]
                                            );
                                        }),
                                    );

                            this.nodeSelectionForm.get('progressionCustomization')?.patchValue({
                                correctAnswersToUpgrade: exDef.correct_answers_to_upgrade,
                                incorrectAnswersToDowngrade: exDef.incorrect_answers_to_downgrade,
                                skippedQuestionsToDowngrade: exDef.skipped_questions_to_downgrade,
                            });

                            this.subscriptions.push(this.byNodeQuestionClasses$.subscribe());
                        }
                    })
            );
        }


        const selectedNodesControl = this.nodeSelectionForm.get('selectedNodes');
        if (selectedNodesControl !== null) {
            this.subscriptions.push(
                selectedNodesControl.valueChanges
                    .subscribe(_ => {
                        this.nodeSelectionForm.markAsDirty();
                    })
            );
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    exerciseDefinitionEqualityCheck(exer1: IExerciseDefinition, exer2: IExerciseDefinition): boolean {
        return exer1.id === exer2.id;
    }

    removeSelectedExerciseDefinitions() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.removeExerciseDefinitions(
            formValue.toRemoveExerciseDefinitions ?? []
        ).subscribe(() => {
            window.alert("Successfully removed selected exercise definitions");
            this.reloadComponentData(true, false);
        });
    }

    getExerciseTotalQuestionCount(): number {
        return this.courseQuestionClasses.reduce((acc, el) => acc += (el.qClassCount ?? 0), 0);
    }

    getNodeTotalQuestions(idNode: number): number {
        return this.nodeQuestionClasses
            .filter(nqc => nqc.id_node === idNode)
            .reduce((acc, el) => acc += el.number_of_questions, 0);
    }
    
    getNodeQuestionClassCount(idNode: number, questionClass: string): number {
        return this.nodeQuestionClasses
            .filter(nqc => nqc.id_node === idNode && nqc.class_name === questionClass)[0]?.number_of_questions ?? 0;
    }


    updateProgressionInformation() {
        const formData = this.nodeSelectionForm.getRawValue();
        if ((formData.selectedExerciseDefinition ?? null) === null) {
            window.alert("You have to select an exercise definition before updateing progression information");
            return;
        }

        this.exerciseDefinitionService.updateProgressionInformation(
            formData.selectedExerciseDefinition!.id,
            formData.progressionCustomization,
        ).subscribe(() => {
            window.alert("Successfully updated exercise progression information");

            this.reloadComponentData(true, true);
        });
    }


    whitelistSelectedNodes() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.addQuestionNodesToWhitelist(
            formValue.selectedNodes
                ?.map(
                    nd => ({ id_exercise_definiton: formValue.selectedExerciseDefinition!.id, id_node: nd.id! })
                ) ?? []
        ).subscribe(() => {
            window.alert("Selected nodes successfully whitelisted");
            this.reloadComponentData(true, true);
        });
    }


    removalSelectionStatus(): "indeterminate" | "full" | "empty" {
        const toRemoveIdsCount = this.nodeSelectionForm.get('toRemoveNodeIds')?.value?.length ?? 0;

        return (toRemoveIdsCount > 0 && toRemoveIdsCount < this.numberOfWhitelistedNodes) ?
            "indeterminate" :
            (
                (toRemoveIdsCount === this.numberOfWhitelistedNodes && toRemoveIdsCount !== 0) ?
                    "full" :
                    "empty"
            );
    }

    setRemovalSelectionToAllNodes(selected: boolean) {
        this.exerciseDefinitionWhitelistedNodes$
            .pipe(take(1))
            .subscribe(nodes => {
                this.nodeSelectionForm.get('toRemoveNodeIds')
                    ?.setValue(selected ? nodes.map(nd => nd.id) : []);
            });
    }

    toggleNodeForRemoval(remove: boolean, nodeId: number) {
        const valArr = this.nodeSelectionForm.get('toRemoveNodeIds')?.value ?? [];
        const idx = valArr.indexOf(nodeId);

        if (idx === -1) {
            valArr.push(nodeId);
        } else if (remove) {
            valArr.splice(idx, 1);
        }

        this.nodeSelectionForm.get('toRemoveNodeIds')?.setValue(valArr);
    }

    removeSelectedNodes() {
        const formValue = this.nodeSelectionForm.getRawValue();

        this.adaptiveExercisesService.removeQuestionNodesFromWhitelist(
            formValue.toRemoveNodeIds
                ?.map(
                    ndId => ({ id_exercise_definiton: formValue.selectedExerciseDefinition!.id, id_node: ndId })
                ) ?? []
        ).subscribe(() => {
            window.alert("Successfully removed selected nodes from whitelist");
            this.reloadComponentData(true, true);
        });
    }
}
