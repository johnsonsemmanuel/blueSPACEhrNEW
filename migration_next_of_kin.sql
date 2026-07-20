ALTER TABLE `employees`
  ADD COLUMN `next_of_kin_name` varchar(191) DEFAULT NULL AFTER `address`,
  ADD COLUMN `next_of_kin_phone` varchar(191) DEFAULT NULL AFTER `next_of_kin_name`,
  ADD COLUMN `next_of_kin_relationship` varchar(191) DEFAULT NULL AFTER `next_of_kin_phone`;
