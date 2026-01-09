#!/bin/bash
################################
# script to collect information required for dashboard and compile it into a json file
# 	- by Rohan J Hopper
#	started 2025-01-07
################################

#path to various files
TEMPLATE=blank-template.json
#CFGPATH=/mnt/nv/mods/test/cfg/  #path for actual tester machine
CFGPATH=.	#path for Rohan's testing


#create destination filename and save as variable
NEWFILENAME="$(hostname)_$(date +"%Y%m%d_%H%M%S").json"
echo "creating $NEWFILENAME created"
cp $TEMPLATE $NEWFILENAME		#copy blank template to file with the new name


#gather information about fixture, cards, etc. give each one a variable
FIXTURENAME=$(hostname)
GENTYPE="stringliteralforsomereason"
# RACKNO="Rack-"$(hostname | cut -c 8-9)
RACKNO="rack-abc"
#FIXTURESN=$(dmidecode -t system | grep "Serial Number" | sed 's/Serial Number: //')	#thanks mehret for showing me how to get this
#FIXTURESN=$(dmidecode -s system-serial-number | sed 's/Serial Number: //')	#give this one a shot also
TESTTYPE="testtesttype"
# IPADDR=$(hostname -i | awk '{print $2}')  #works on tester
IPADDR=$(hostname -i)		#works on rohan's WSL
MACADDR=$(ifconfig | grep ether | awk '{print $2}')
CREATOR="tester"


echo "getting individual GPU info"RACKNO="Rack-"$(hostname | cut -c 8-9)
0as#Logic for getting GPU information:
# first check if left slot is full, set flag accordingly.
# if left is full, use serial_no from uutself to get card info, if not procees
# if second slot is also full, use serial_number2 from uutself
GPUSN1=$(grep "serial_number=" $CFGPATH/uutself.cfg.env | sed 's/serial_number=//')
GPUSN2=$(grep "serial_number2=" $CFGPATH/uutself.cfg.env | sed 's/serial_number2=//')

FIXTUREPARTID="stringliteral"
TESTSLOT="stringliteral"
TESTSTATION=$(grep current_stc_name $CFGPATH/$GPUSN1.RSP | sed 's/current_stc_name=//')
GPUPN=$(grep "part_number" $GPUSN1.RSP | sed 's/part_number=//')
echo "gpusn1=$GPUSN1 gpusn2=$GPUSN2 asbcdefg"
echo "GPU part numer=$GPUPN"
LOGPATH="stringliteral"



echo "beginning replacement"
#run the sed replacements on the newly created template file, using the variables that were just created for each field
sed -i "s/fixture_name.*/fixture_name\":\"$FIXTURENAME\",/" $NEWFILENAME
sed -i "s/gen_type.*/gen_type\":\"$GENTYPE\",/" $NEWFILENAME
sed -i "s/rack.*/rack\":\"$RACKNO\",/" $NEWFILENAME
sed -i "s/fixture_sn.*/fixture_sn\":\"$FIXTURESN\",/" $NEWFILENAME
sed -i "s/test_type.*/test_type\":\"$TESTTYPE\",/" $NEWFILENAME
sed -i "s/ip_address.*/ip_address\":\"$IPADDR\",/" $NEWFILENAME
sed -i "s/mac_address.*/mac_address\":\"$MACADDR\",/" $NEWFILENAME
sed -i "s/creator.*/creator\":\"$CREATOR\"/" $NEWFILENAME

#test adding a line to see if it shows up on tester
#looks like it worked :] - tester
