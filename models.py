[1mdiff --cc Backend/accounts/models.py[m
[1mindex 6e5123b,5b3c073..0000000[m
[1m--- a/Backend/accounts/models.py[m
[1m+++ b/Backend/accounts/models.py[m
[36m@@@ -9,8 -9,9 +9,13 @@@[m [mclass UserProfile(models.Model)[m
          ("ADMIN", "Admin"),[m
  [m
          ("PRINCIPAL", "Principal"),[m
[32m+         ("TEACHER", "Teacher"),[m
  [m
  [m
[32m++<<<<<<< HEAD[m
[32m++[m
[32m++=======[m
[32m++>>>>>>> f1cbe54 (Implement teacher SF9 grading and student records)[m
  [m
          ("STUDENTS", "Students"),[m
  [m
